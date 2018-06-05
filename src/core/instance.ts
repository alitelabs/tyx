import { InternalServerError, NotFound } from "../errors/http";
import { MethodInfo, ResolverArgs, ResolverContext, ResolverInfo, ResolverQuery } from "../graphql/types";
import { Container, ContainerInstance } from "../import/typedi";
import { Logger } from "../logger";
import { EventRouteMetadata, HttpRouteMetadata, MethodMetadata } from "../metadata/method";
import { ProxyMetadata } from "../metadata/proxy";
import { Registry } from "../metadata/registry";
import { ServiceMetadata } from "../metadata/service";
import { Configuration } from "../types/config";
import { ContainerState, Context, CoreContainer, ObjectType } from "../types/core";
import { EventRequest, EventResult } from "../types/event";
import { HttpRequest, HttpResponse } from "../types/http";
import { RemoteRequest } from "../types/proxy";
import { Security } from "../types/security";
import { Utils } from "../utils";
import { CoreConfiguration } from "./config";
import { Core } from "./core";
import { HttpUtils } from "./http";
import { CoreSecurity } from "./security";

export class CoreInstance implements CoreContainer {

    private application: string;
    private name: string;
    public log: Logger;

    private container: ContainerInstance;
    private config: Configuration;
    private security: Security;
    private istate: ContainerState;

    constructor(application: string, name: string, index?: number) {
        this.application = application;
        this.name = name || CoreInstance.name;
        if (index !== undefined) this.name += ":" + index;

        this.container = Container.of(this.name);
        this.container.set(CoreContainer, this);

        this.log = Logger.get(this.application, this.name);
        this.istate = ContainerState.Pending;

        // if (this.istate !== ContainerState.Pending) throw new InternalServerError("Invalid container state");

        if (!Container.has(Configuration)) {
            this.log.warn("Using default configuration service!");
            this.container.set({ id: Configuration, type: CoreConfiguration });
        }
        this.config = this.container.get(Configuration);
        if (this.config instanceof CoreConfiguration) {
            this.config.init(this.application);
        } else if (!ServiceMetadata.has(this.config)) {
            throw new TypeError(`Configuration must be a service`);
        }

        if (!Container.has(Security)) {
            this.log.warn("Using default security service!");
            this.container.set({ id: Security, type: CoreSecurity });
        }
        this.security = this.container.get(Security);
        if (this.security instanceof CoreSecurity) {
            // OK
        } else if (!ServiceMetadata.has(this.security)) {
            throw new TypeError(`Security must be a service`);
        }

        this.istate = ContainerState.Ready;
    }

    public get state() {
        return this.istate;
    }

    public reserve() {
        if (this.istate !== ContainerState.Ready)
            throw new InternalServerError("Invalid container state");
        this.istate = ContainerState.Reserved;
    }

    public get<T>(type: ObjectType<T> | string): T {
        if (typeof type === "string") return this.container.get<T>(type);
        let proxy = ProxyMetadata.get(type);
        if (proxy) return this.container.get(proxy.alias);
        let service = ServiceMetadata.get(type);
        if (service) return this.container.get(service.alias);
        return undefined;
    }

    // --------------------------------------------------

    public async invoke(method: MethodInfo, obj: any, args: ResolverQuery & ResolverArgs, ctx: ResolverContext, info: ResolverInfo): Promise<any> {
        return Core.remoteRequest({
            type: "graphql",
            requestId: ctx.requestId,
            application: this.application,
            service: method.api,
            method: method.method,
            args: [args],
            token: ctx.auth.token
        });
    }

    public async remoteRequest(req: RemoteRequest): Promise<any> {
        if (this.istate !== ContainerState.Reserved) throw new InternalServerError("Invalid container state");
        try {
            this.log.debug("Remote Request: %j", req);

            if (req.application !== this.application) throw this.log.error(new NotFound(`Application not found [${req.application}]`));
            let service = this.container.get(req.service);
            if (!service) throw this.log.error(new NotFound(`Service not found [${req.service}]`));
            let methodId = MethodMetadata.id(req.service, req.method);
            let metadata = Registry.MethodMetadata[methodId];
            if (!metadata) throw this.log.error(new NotFound(`Method not found [${methodId}]`));

            this.istate = ContainerState.Busy;
            let ctx = await this.security.remoteAuth(this, req, metadata);

            let log = Logger.get(service);
            let startTime = log.time();
            try {
                await this.activate(ctx);
                let handler: Function = service[metadata.name];
                let result = await handler.apply(service, req.args);
                return result;
            } catch (e) {
                throw this.log.error(e);
            } finally {
                log.timeEnd(startTime, `${metadata.name}`);
                await this.release(ctx);
            }
        } finally {
            this.istate = ContainerState.Ready;
        }
    }

    public async eventRequest(req: EventRequest): Promise<EventResult> {
        if (this.istate !== ContainerState.Reserved) throw new InternalServerError("Invalid container state");
        try {
            req.type = "event";
            this.log.debug("Event Request: %j", req);

            let route = EventRouteMetadata.route(req.source, req.resource);
            let alias = this.config.resources && this.config.resources[req.resource];
            let metadatas = Registry.EventRouteMetadata[route];
            if (!metadatas) {
                route = EventRouteMetadata.route(req.source, alias);
                metadatas = Registry.EventRouteMetadata[route];
            }
            if (!metadatas) throw this.log.error(new NotFound(`Event handler not found [${route}] [${req.object}]`));

            let result: EventResult = {
                status: null,
                source: req.source,
                action: req.action,
                resource: req.resource,
                object: req.object,
                returns: []
            };

            this.istate = ContainerState.Busy;
            for (let target of metadatas) {
                let service = this.container.get(target.alias);
                if (!service) throw this.log.error(new NotFound(`Service not found [${req.service}]`));
                let methodId = MethodMetadata.id(target.alias, target.handler);
                let method = Registry.MethodMetadata[methodId];

                if (!Utils.wildcardMatch(target.actionFilter, req.action)
                    || !Utils.wildcardMatch(target.objectFilter, req.object)) continue;

                req.application = this.application;
                req.service = target.alias;
                req.method = target.handler;

                let ctx = await this.security.eventAuth(this, req, method);

                let log = Logger.get(service);
                let startTime = log.time();
                try {
                    await this.activate(ctx);
                    for (let record of req.records) {
                        req.record = record;
                        let handler = service[target.handler];
                        let data: any;
                        if (target.adapter) {
                            data = await target.adapter(handler.bind(service), ctx, req);
                        } else {
                            data = await handler.call(service, ctx, req);
                        }
                        result.status = result.status || "OK";
                        result.returns.push({
                            service: target.alias,
                            method: target.handler,
                            error: null,
                            data
                        });
                    }
                } catch (e) {
                    this.log.error(e);
                    result.status = "FAILED";
                    result.returns.push({
                        service: target.alias,
                        method: target.handler,
                        error: InternalServerError.wrap(e),
                        data: null
                    });
                } finally {
                    log.timeEnd(startTime, `${target.handler}`);
                    await this.release(ctx);
                }
            }
            result.status = result.status || "NOP";
            return result;
        } finally {
            this.istate = ContainerState.Ready;
        }
    }

    public async httpRequest(req: HttpRequest): Promise<HttpResponse> {
        if (this.istate !== ContainerState.Reserved) throw new InternalServerError("Invalid container state");
        try {
            req.type = "http";
            this.log.debug("HTTP Event: %j", req);

            HttpUtils.request(req);

            let route = HttpRouteMetadata.route(req.httpMethod, req.resource, req.contentType.domainModel);
            let target = Registry.HttpRouteMetadata[route];
            if (!target) throw this.log.error(new NotFound(`Route not found [${route}]`));
            let service = this.container.get(target.alias);
            if (!service) throw this.log.error(new NotFound(`Service not found [${req.service}]`));
            let methodId = MethodMetadata.id(target.alias, target.handler);
            let method = Registry.MethodMetadata[methodId] as MethodMetadata;

            req.application = this.application;
            req.service = target.alias;
            req.method = target.handler;

            this.istate = ContainerState.Busy;
            let ctx = await this.security.httpAuth(this, req, method);

            let log = Logger.get(service);
            let startTime = log.time();
            try {
                await this.activate(ctx);

                this.log.debug("HTTP Context: %j", ctx);
                this.log.debug("HTTP Request: %j", req);

                let handler: Function = service[method.name];
                let http = method.http[route];
                let result: any;
                if (http.adapter) {
                    result = await http.adapter(
                        handler.bind(service),
                        ctx,
                        req,
                        req.pathParameters || {},
                        req.queryStringParameters || {});
                } else {
                    let args: any = [];
                    for (let [index, arg] of method.bindings.entries()) {
                        args[index] = (arg.binder ? arg.binder(ctx, req) : undefined);
                    }
                    result = await handler.apply(service, args);
                }

                let contentType = method.contentType || "application/json";
                if (contentType !== HttpResponse) result = { statusCode: http.code, body: result, contentType };
                if (ctx && ctx.auth.renewed && ctx.auth.token) {
                    result.headers = result.headers || {};
                    result.headers["Token"] = ctx.auth.token;
                }
                this.log.debug("Response: %j", result);
                return result;
            } catch (e) {
                this.log.error(e);
                throw InternalServerError.wrap(e);
            } finally {
                log.timeEnd(startTime, `${method.name}`);
                await this.release(ctx);
            }
        } finally {
            this.istate = ContainerState.Ready;
        }
    }

    public async activate(ctx: Context): Promise<Context> {
        for (let [sid, meta] of Object.entries(Registry.ServiceMetadata)) {
            if (!meta.activator) continue;
            if (!this.container.has(sid)) continue;
            try {
                let service = this.container.get(sid);
                let handler = service[meta.activator.method] as Function;
                await handler.call(service, ctx);
            } catch (e) {
                this.log.error("Failed to activate service: [%s]", sid);
                this.log.error(e);
                throw e;
                // TODO: Error state for container
            }
        }
        return ctx;
    }

    public async release(ctx: Context): Promise<void> {
        for (let [sid, meta] of Object.entries(Registry.ServiceMetadata)) {
            if (!meta.releasor) continue;
            if (!this.container.has(sid)) continue;
            try {
                let service = this.container.get(sid);
                let handler = service[meta.releasor.method] as Function;
                await handler.call(service, ctx);
            } catch (e) {
                this.log.error("Failed to release service: [%s]", sid);
                this.log.error(e);
                // TODO: Error state for container
            }
        }
    }
}


