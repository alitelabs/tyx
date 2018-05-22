import { BaseConfiguration, Configuration, DefaultConfiguration, DefaultSecurity, Security } from "../base";
import { Proxy, Service } from "../decorators";
import { Forbidden, InternalServerError, NotFound } from "../errors";
import { Logger } from "../logger";
import { AuthMetadata, ContainerMetadata, EventMetadata, HttpMetadata, Metadata, ProxyMetadata, ServiceMetadata } from "../metadata";
import { Container, ContainerState, Context, EventHandler, EventRequest, EventResult, HttpHandler, HttpRequest, HttpResponse, ObjectType, RemoteHandler, RemoteRequest } from "../types";
import { HttpUtils, Utils } from "../utils";

export class ContainerInstance implements Container {
    private application: string;
    private name: string;

    private log: Logger;

    private config: Configuration;
    private security: Security;

    private istate: ContainerState;
    private imetadata: ContainerMetadata;

    private resources: Record<string, any>;
    private services: Record<string, Service>;
    private proxies: Record<string, Proxy>;

    private remoteHandlers: Record<string, RemoteHandler>;
    private httpHandlers: Record<string, HttpHandler>;
    private eventHandlers: Record<string, EventHandler[]>;

    constructor(application: string, name: string, index?: string) {
        this.application = application;
        this.name = name || ContainerInstance.name;
        if (index !== undefined) this.name += ":" + index;

        this.log = Logger.get(this.application, this.name);
        this.istate = ContainerState.Pending;
        this.resources = {};
        this.services = {};
        this.proxies = {};
        this.remoteHandlers = {};
        this.httpHandlers = {};
        this.eventHandlers = {};
        this.imetadata = {
            authMetadata: {},
            resolverMetadata: {},
            httpMetadata: {},
            eventMetadata: {}
        };
    }

    public get state() {
        return this.istate;
    }

    public get metadata() {
        return this.imetadata;
    }

    public get<T>(type: ObjectType<T> | string): T {
        if (type === Configuration) return this.config as any;
        if (type === Security) return this.config as any;
        if (typeof type === "string") return this.services[type] || this.proxies[type] || this.resources[type];
        if (ServiceMetadata.has(type)) return this.services[Metadata.name(type)] as any;
        if (ProxyMetadata.has(type)) return this.proxies[Metadata.name(type)] as any;
        return null;
    }

    public register(resource: Object, name?: string): this;
    public register(service: Service): this;
    public register(proxy: Proxy): this;
    public register(type: Function, ...args: any[]): this;
    public register(target: Object | Service | Proxy | Function, ...args: any[]): this {
        if (this.istate !== ContainerState.Pending) throw new InternalServerError("Invalid container state");

        let name: string = undefined;

        // Call constructor
        // https://stackoverflow.com/questions/1606797/use-of-apply-with-new-operator-is-this-possible
        if (target instanceof Function) {
            target = new (Function.prototype.bind.apply(target, arguments));
        } else {
            name = args && args[0];
        }

        let id: string;
        if (name) {
            id = name = "" + name;
        } else if (ServiceMetadata.has(target)) {
            let meta = ServiceMetadata.get(target);
            id = name = meta.name;
        } else if (ProxyMetadata.has(target)) {
            let meta = ProxyMetadata.get(target);
            name = meta.name;
            id = (meta.application || this.application) + ":" + meta.name;
        } else {
            id = name = target.constructor.name;
        }

        if (this.services[id] || this.proxies[id] || this.resources[id]) throw new InternalServerError(`Duplicate registration [${id}]`);

        if (name === Configuration) {
            if (!ServiceMetadata.has(target)) throw new InternalServerError(`Configuration must be a service`);
            this.config = target as Configuration;
            if (target instanceof BaseConfiguration) {
                target.init(this.application);
            }
        }
        if (name === Security) {
            if (!ServiceMetadata.has(target)) throw new InternalServerError(`Security must be a service`);
            this.security = target as any;
        }

        if (ServiceMetadata.has(target)) {
            this.services[id] = target as Service;
            this.log.info("Service: %s", id);
        } else if (ProxyMetadata.has(target)) {
            this.proxies[id] = target as Proxy;
            this.log.info("Proxy: %s", id);
        } else {
            this.resources[id] = target;
            this.log.info("Resource: %s", id);
        }
        return this;
    }

    public publish(type: Function, ...args: any[]): this;
    public publish(object: Service): this;
    public publish(objectOrType: Service | Function, ...args: any[]): this {
        if (this.istate !== ContainerState.Pending) throw new InternalServerError("Invalid container state");

        // Call constructor
        let service: Service;
        if (objectOrType instanceof Function) {
            service = new (Function.prototype.bind.apply(objectOrType, arguments)) as Service;
        } else {
            service === objectOrType;
        }

        if (!ServiceMetadata.has(service)) throw new InternalServerError("Service decoration missing");
        this.register(service);

        service = service as Service;
        let metadata = ServiceMetadata.get(service);
        this.log.info("Publish: %s", metadata.service);

        for (let meta of Object.values(metadata.authMetadata)) {
            let key = metadata.service + "." + meta.method;
            this.imetadata.authMetadata[key] = meta;
            if (!meta.roles.Internal && !meta.roles.External && !meta.roles.Remote) continue;
            this.remoteHandlers[key] = this.remoteHandler(service, meta);
        }

        for (let meta of Object.values(metadata.resolverMetadata)) {
            let key = metadata.service + "." + meta.method;
            this.imetadata.resolverMetadata[key] = meta;
        }

        for (let [route, meta] of Object.entries(metadata.httpMetadata)) {
            if (this.imetadata.httpMetadata[route]) throw new InternalServerError(`Duplicate REST route [${route}]`);
            this.imetadata.httpMetadata[route] = meta;
            this.httpHandlers[route] = this.httpHandler(service, meta, route);
        }

        for (let [route, metas] of Object.entries(metadata.eventMetadata)) {
            this.imetadata.eventMetadata[route] = this.imetadata.eventMetadata[route] || [];
            this.imetadata.eventMetadata[route] = this.imetadata.eventMetadata[route].concat(metas);
            let handlers = metas.map(m => this.eventHandler(service, m, route));
            this.eventHandlers[route] = this.eventHandlers[route] || [];
            this.eventHandlers[route] = this.eventHandlers[route].concat(handlers);
        }
        return this;
    }

    private remoteHandler(service: Service, metadata: AuthMetadata): RemoteHandler {
        let fun: RemoteHandler = async (ctx: Context, req: RemoteRequest): Promise<any> => {
            let log: Logger = service.log || this.log;
            let startTime = log.time();
            try {
                let method: Function = service[metadata.method];
                let result = await method.apply(service, req.args);
                return result;
            } catch (e) {
                throw e;
            } finally {
                log.timeEnd(startTime, `${metadata.method}`);
            }
        };
        return fun;
    }

    private httpHandler(service: Service, metadata: HttpMetadata, route: string): HttpHandler {
        let fun: HttpHandler = async (ctx: Context, req: HttpRequest): Promise<HttpResponse> => {
            let log: Logger = service.log || this.log;
            let startTime = log.time();
            try {
                let method: Function = service[metadata.method];
                let http = metadata.http[route];
                let result: any;
                if (http.adapter) {
                    result = await http.adapter(
                        method.bind(service),
                        ctx,
                        req,
                        req.pathParameters || {},
                        req.queryStringParameters || {});
                } else {
                    let args: any = [];
                    for (let [index, arg] of metadata.bindings.entries()) {
                        args[index] = (arg.binder ? arg.binder(ctx, req) : undefined);
                    }
                    result = await method.apply(service, args);
                }
                let contentType = metadata.contentType || "application/json";
                return { statusCode: http.code, body: result, contentType };
            } catch (e) {
                throw e;
            } finally {
                log.timeEnd(startTime, `${metadata.method}`);
            }
        };
        return fun;
    }

    private eventHandler(service: Service, metadata: EventMetadata, route: string): EventHandler {
        let handler: EventHandler = async (ctx: Context, req: EventRequest): Promise<any> => {
            let log: Logger = service.log || this.log;
            let startTime = log.time();
            try {
                let result: Promise<any>;
                let method: Function = service[metadata.method];
                let event = metadata.events[route];
                if (event.adapter) {
                    result = await event.adapter(method.bind(service), ctx, req);
                } else {
                    result = await method.call(service, ctx, req);
                }
                return result;
            } catch (e) {
                throw e;
            } finally {
                log.timeEnd(startTime, `${metadata.method}`);
            }
        };
        return handler;
    }

    public async prepare(): Promise<this> {
        if (this.istate !== ContainerState.Pending) throw new InternalServerError("Invalid container state");

        if (!this.config) {
            this.register(new DefaultConfiguration());
            this.log.warn("Using default configuration service!");
        }
        if (!this.security) {
            this.register(new DefaultSecurity());
            this.log.warn("Using default security service!");
        }

        Object.values(this.services).forEach(service => this.inject(service));
        Object.values(this.proxies).forEach(proxy => this.inject(proxy));

        for (let proxy of Object.values(this.proxies)) {
            if (!proxy.initialize) continue;
            await proxy.initialize();
        }

        for (let service of Object.values(this.services)) {
            if (!service.initialize) continue;
            await service.initialize();
        }

        this.istate = ContainerState.Ready;
        return this;
    }

    private inject(target: object) {
        let meta = Metadata.get(target);
        if (!meta || !meta.dependencies) return;
        for (let [pid, dep] of Object.entries(meta.dependencies)) {
            let localId = dep.resource;
            let proxyId = (dep.application || this.application) + ":" + localId;
            let resolved = this.proxies[proxyId] || this.services[localId] || this.resources[localId];
            if (dep.resource === Container) resolved = this;
            if (dep.resource === "logger") resolved = Logger.get(meta.name, target);
            let depId = (dep.application ? dep.application + ":" : "") + localId;
            if (!resolved)
                throw new InternalServerError(`Unresolved dependency [${depId}] on [${target.constructor.name}.${pid}]`);
            this.log.info(`Resolved dependency [${depId}] on [${target.constructor.name}.${pid}]`);
            target[pid] = resolved;
        }
    }

    // --------------------------------------------------

    public async remoteRequest(req: RemoteRequest): Promise<any> {
        if (this.istate !== ContainerState.Ready) throw new InternalServerError("Invalid container state");

        this.istate = ContainerState.Reserved;
        try {
            this.log.debug("Remote Request: %j", req);

            if (req.application !== this.application) {
                throw this.log.error(new NotFound(`Application not found [${req.application}]`));
            }

            let service = this.services[req.service];
            if (!service) throw this.log.error(new NotFound(`Service not found [${req.service}]`));

            let permissionId = req.service + "." + req.method;
            let permission = permissionId && this.imetadata.authMetadata[permissionId] as AuthMetadata;
            if (permission == null) throw this.log.error(new Forbidden(`Undefined permission for method [${permissionId}]`));

            let handler: RemoteHandler = this.remoteHandlers[permissionId];
            if (!handler) throw this.log.error(new NotFound(`Method not found [${permissionId}]`));

            this.istate = ContainerState.Busy;
            let ctx = await this.security.remoteAuth(this, req, permission);
            // let ctx = await this.security.localAuth();

            try {
                await this.activate(ctx);
                let result = await handler(ctx, req);
                return result;
            } catch (e) {
                throw this.log.error(e);
            } finally {
                await this.release(ctx);
            }
        } finally {
            this.istate = ContainerState.Ready;
        }
    }

    public async eventRequest(req: EventRequest): Promise<EventResult> {
        if (this.istate !== ContainerState.Ready) throw new InternalServerError("Invalid container state");

        this.istate = ContainerState.Reserved;
        try {
            req.type = "event";
            this.log.debug("Event Request: %j", req);

            let route = `${req.source} ${req.resource}`;
            let alias = this.config.resources && this.config.resources[req.resource];

            let metas = this.imetadata.eventMetadata[route];
            let handlers = this.eventHandlers && this.eventHandlers[route];
            if (!handlers && alias) {
                route = `${req.source} ${alias}`;
                metas = this.imetadata.eventMetadata[route];
                handlers = this.eventHandlers && this.eventHandlers[route];
            }
            if (!handlers) throw this.log.error(new NotFound(`Event handler not found [${route}] [${req.object}]`));

            let result: EventResult = {
                status: null,
                source: req.source,
                action: req.action,
                resource: req.resource,
                object: req.object,
                returns: []
            };

            this.istate = ContainerState.Busy;
            for (let i = 0; i < handlers.length; i++) {
                let handler = handlers[i];
                let target = metas[i];
                if (!Utils.wildcardMatch(target[route].actionFilter, req.action)
                    || !Utils.wildcardMatch(target[route].objectFilter, req.object)) continue;

                req.application = this.application;
                req.service = target.service;
                req.method = target.method;

                let permissionId = req.service + "." + req.method;
                let permission = permissionId && this.imetadata.authMetadata[permissionId] as AuthMetadata;
                if (permission == null) throw this.log.error(new Forbidden(`Undefined permission for method [${permissionId}]`));

                let ctx = await this.security.eventAuth(this, req, permission);

                try {
                    await this.activate(ctx);
                    for (let record of req.records) {
                        req.record = record;
                        let data = await handler(ctx, req);
                        result.status = result.status || "OK";
                        result.returns.push({
                            service: target.service,
                            method: target.method,
                            error: null,
                            data
                        });
                    }
                } catch (e) {
                    this.log.error(e);
                    result.status = "FAILED";
                    result.returns.push({
                        service: target.service,
                        method: target.method,
                        error: InternalServerError.wrap(e),
                        data: null
                    });
                } finally {
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
        if (this.istate !== ContainerState.Ready) throw new InternalServerError("Invalid container state");

        this.istate = ContainerState.Reserved;
        try {
            req.type = "http";
            this.log.debug("HTTP Event: %j", req);

            HttpUtils.request(req);

            let key = `${req.httpMethod} ${req.resource}`;
            if (req.contentType.domainModel) key += `:${req.contentType.domainModel}`;
            let handler = this.httpHandlers && this.httpHandlers[key];
            if (!handler) throw this.log.error(new NotFound(`Route not found [${key}]`));

            let target = this.imetadata.httpMetadata[key];

            req.application = this.application;
            req.service = target.service;
            req.method = target.method;

            let permissionId = req.service + "." + req.method;
            let permission = permissionId && this.imetadata.authMetadata[permissionId] as AuthMetadata;
            if (permission == null) throw this.log.error(new Forbidden(`Undefined permission for method [${permissionId}]`));

            this.istate = ContainerState.Busy;
            let ctx = await this.security.httpAuth(this, req, permission);

            try {
                await this.activate(ctx);

                this.log.debug("HTTP Context: %j", ctx);
                this.log.debug("HTTP Request: %j", req);

                let res = await handler(ctx, req);
                if (res.contentType === HttpResponse) res = res.body;
                if (ctx && ctx.auth.renewed && ctx.auth.token) {
                    res.headers = res.headers || {};
                    res.headers["Token"] = ctx.auth.token;
                }
                this.log.debug("Response: %j", res);
                return res;
            } catch (e) {
                this.log.error(e);
                throw InternalServerError.wrap(e);
            } finally {
                await this.release(ctx);
            }
        } finally {
            this.istate = ContainerState.Ready;
        }
    }

    public async activate(ctx: Context): Promise<Context> {
        for (let sid in this.services) {
            let service = this.services[sid];
            try {
                if (service.activate) await service.activate(ctx);
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
        for (let sid in this.services) {
            let service = this.services[sid];
            try {
                if (service.release) await service.release(ctx);
            } catch (e) {
                this.log.error("Failed to release service: [%s]", sid);
                this.log.error(e);
                // TODO: Error state for container
            }
        }
    }
}


