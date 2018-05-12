import "../env";

import {
    Context,
    HttpCode,
    RestCall,
    RestResult,
    RemoteCall,
    EventCall,
    EventResult
} from "../types";

import {
    Metadata,
    ServiceMetadata,
    ProxyMetadata,
    RemoteMetadata,
    RestMetadata,
    BindingMetadata,
    EventMetadata,
    ContainerMetadata
} from "../metadata";

import {
    Service,
    Proxy
} from "../decorators";

import {
    Configuration,
    Security,
    BaseConfiguration,
    DefaultConfiguration,
    DefaultSecurity,
    BaseProxy
} from "../base";

import {
    NotFound,
    Forbidden,
    InternalServerError
} from "../errors";

import {
    RestUtils
} from "../utils";

import {
    Logger
} from "../logger";

import {
    Container,
    ContainerState,
    RemoteHandler,
    RestHandler,
    EventHandler,
    ObjectType
} from "./common";

import { Utils } from "../utils";


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
    private restHandlers: Record<string, RestHandler>;
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
        this.restHandlers = {};
        this.eventHandlers = {};
        this.imetadata = {
            permissions: {},
            restMetadata: {},
            remoteMetadata: {},
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
        if (ServiceMetadata.has(type)) return this.services[ServiceMetadata.service(type)] as any;
        if (ProxyMetadata.has(type)) return this.proxies[ProxyMetadata.service(type)] as any;
        return null;
    }

    public register(resource: Object, name?: string): this;
    public register(service: Service): this;
    public register(proxy: Proxy): this;
    public register(type: Function, ...args: any[]): this;
    public register(target: Object | Service | Proxy | Function, ...args: any[]): this {
        if (this.istate !== ContainerState.Pending) throw new InternalServerError("Invalid container state");

        let name = undefined;

        // Call constructor
        // https://stackoverflow.com/questions/1606797/use-of-apply-with-new-operator-is-this-possible
        if (target instanceof Function) {
            target = new (Function.prototype.bind.apply(target, arguments));
        } else {
            name = args && args[0];
        }

        let id = name;
        if (name) {
            id = name = "" + name;
        } else if (ServiceMetadata.has(target)) {
            name = ServiceMetadata.service(target);
            id = name;
        } else if (ProxyMetadata.has(target)) {
            name = ProxyMetadata.service(target);
            id = ProxyMetadata.id(target, this.application);
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
            this.services[id] = target;
            this.log.info("Service: %s", id);
        } else if (ProxyMetadata.has(target)) {
            this.proxies[id] = target;
            this.log.info("Proxy: %s", id);
        } else {
            this.resources[id] = target;
            this.log.info("Resource: %s", id);
        }
        return this;
    }

    public publish(service: Function, ...args: any[]): this;
    public publish(service: Service): this;
    public publish(service: Service | Function, ...args: any[]): this {
        if (this.istate !== ContainerState.Pending) throw new InternalServerError("Invalid container state");

        // Call constructor
        if (service instanceof Function) {
            service = new (Function.prototype.bind.apply(service, arguments)) as Service;
        }

        if (!ServiceMetadata.has(service)) throw new InternalServerError("Service decoration missing");
        this.register(service);

        let serviceName = ServiceMetadata.service(service);
        this.log.info("Publish: %s", serviceName);

        let permissionMetadata = ServiceMetadata.permissions(service);
        let permissions = Object.keys(permissionMetadata);
        permissions.forEach(method => {
            let meta = permissionMetadata[method];
            let key = meta.service + "." + method;
            this.imetadata.permissions[key] = meta;
        });

        let remoteMetadata = ServiceMetadata.remoteMetadata(service);
        let remotes = Object.keys(remoteMetadata);
        remotes.forEach(name => {
            let meta = remoteMetadata[name];
            let key = meta.service + "." + name;
            if (this.imetadata.remoteMetadata[key]) throw new InternalServerError(`Duplicate service method [${key}]`);
            this.imetadata.remoteMetadata[key] = meta;
            this.remoteHandlers[key] = this.remoteHandler(service as Service, meta);
        });

        let restMetadata = ServiceMetadata.restMetadata(service);
        let bindMetadata = ServiceMetadata.bindingMetadata(service);
        let routes = Object.keys(restMetadata);
        routes.forEach(route => {
            let meta = restMetadata[route];
            if (this.imetadata.restMetadata[route]) throw new InternalServerError(`Duplicate REST route [${route}]`);
            this.imetadata.restMetadata[route] = meta;
            let bindings = bindMetadata[meta.method];
            this.restHandlers[route] = this.restHandler(service as Service, meta, bindings);
        });

        let eventMetadata = ServiceMetadata.eventMetadata(service);
        let events = Object.keys(eventMetadata);
        events.forEach(event => {
            let metas = eventMetadata[event];
            this.imetadata.eventMetadata[event] = this.imetadata.eventMetadata[event] || [];
            this.imetadata.eventMetadata[event] = this.imetadata.eventMetadata[event].concat(metas);
            let handlers = metas.map(m => this.eventHandler(service as Service, m));
            this.eventHandlers[event] = this.eventHandlers[event] || [];
            this.eventHandlers[event] = this.eventHandlers[event].concat(handlers);
        });
        return this;
    }

    private remoteHandler(service: Service, metadata: RemoteMetadata): RemoteHandler {
        let fun: RemoteHandler = async (ctx: Context, call: RemoteCall): Promise<any> => {
            let log: Logger = service.log || this.log;
            let startTime = log.time();
            try {
                let method: Function = service[metadata.method];
                let result = await method.apply(service, call.args);
                return result;
            } catch (e) {
                throw e;
            } finally {
                log.timeEnd(startTime, `${metadata.method}`);
            }
        };
        return fun;
    }

    private restHandler(service: Service, metadata: RestMetadata, bindings: BindingMetadata): RestHandler {
        let fun: RestHandler = async (ctx: Context, call: RestCall): Promise<[number, any, string]> => {
            let log: Logger = service.log || this.log;
            let startTime = log.time();
            try {
                let method: Function = service[metadata.method];
                let result: any;
                if (metadata.adapter) {
                    result = await metadata.adapter(
                        method.bind(service),
                        ctx,
                        call,
                        call.pathParameters || {},
                        call.queryStringParameters || {});
                } else if (bindings && bindings.argBindings) {
                    let args: any = [];
                    for (let binding of bindings.argBindings) {
                        args[binding.index] = binding.binder(ctx, call);
                    }
                    result = await method.apply(service, args);
                } else {
                    result = await method.apply(service);
                }
                let contentType = bindings && bindings.contentType || "application/json";
                return [metadata.code, result, contentType];
            } catch (e) {
                throw e;
            } finally {
                log.timeEnd(startTime, `${metadata.method}`);
            }
        };
        return fun;
    }

    private eventHandler(service: Service, metadata: EventMetadata): EventHandler {
        let handler: EventHandler = async (ctx: Context, call: EventCall): Promise<any> => {
            let log: Logger = service.log || this.log;
            let startTime = log.time();
            try {
                let result: Promise<any>;
                let method: Function = service[metadata.method];
                if (metadata.adapter) {
                    result = await metadata.adapter(method.bind(service), ctx, call);
                } else {
                    result = await method.call(service, ctx, call);
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

    public prepare(): this {
        if (this.istate !== ContainerState.Pending) throw new InternalServerError("Invalid container state");

        if (!this.config) {
            this.register(new DefaultConfiguration());
            this.log.warn("Using default configuration service!");
        }
        if (!this.security) {
            this.register(new DefaultSecurity());
            this.log.warn("Using default security service!");
        }

        for (let sid in this.services) {
            let service = this.services[sid];
            this.inject(service);
        }

        for (let pid in this.proxies) {
            let proxy = this.proxies[pid];
            if (proxy instanceof BaseProxy) {
                proxy.initialize(this.config, this.security);
            }
            this.inject(proxy);
        }

        this.istate = ContainerState.Ready;

        return this;
    }

    private inject(service: Service) {
        let dependencies = Metadata.dependencies(service);
        for (let pid in dependencies) {
            let dep = dependencies[pid];
            let localId = dep.resource;
            let proxyId = (dep.application || this.application) + ":" + localId;
            let resolved = this.proxies[proxyId] || this.services[localId] || this.resources[localId];
            let depId = (dep.application ? dep.application + ":" : "") + localId;
            if (!resolved)
                throw new InternalServerError(`Unresolved dependency [${depId}] on [${service.constructor.name}.${pid}]`);
            this.log.info(`Resolved dependency [${depId}] on [${service.constructor.name}.${pid}]`);
            service[pid] = resolved;
        }
    }

    // --------------------------------------------------

    public async remoteCall(call: RemoteCall): Promise<any> {
        if (this.istate !== ContainerState.Ready) throw new InternalServerError("Invalid container state");

        this.istate = ContainerState.Reserved;
        try {
            this.log.debug("Remote Call: %j", call);

            if (call.application !== this.application) {
                throw this.log.error(new NotFound(`Application not found [${call.application}]`));
            }

            let service = this.services[call.service];
            if (!service) throw this.log.error(new NotFound(`Service not found [${call.service}]`));

            let permissionId = call.service + "." + call.method;
            let permission = permissionId && this.imetadata.permissions[permissionId];
            if (permission == null) throw this.log.error(new Forbidden(`Undefined permission for method [${permissionId}]`));

            let caller: RemoteHandler = this.remoteHandlers[permissionId];
            if (!caller) throw this.log.error(new NotFound(`Method not found [${permissionId}]`));

            this.istate = ContainerState.Busy;
            let ctx = await this.security.remoteAuth(call, permission);
            // let ctx = await this.security.localAuth();

            try {
                await this.activate(ctx);
                let result = await caller(ctx, call);
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

    public async eventCall(call: EventCall): Promise<EventResult> {
        if (this.istate !== ContainerState.Ready) throw new InternalServerError("Invalid container state");

        this.istate = ContainerState.Reserved;
        try {
            call.type = "event";
            this.log.debug("Event Call: %j", call);

            let key = `${call.source} ${call.resource}`;
            let alias = this.config.resources && this.config.resources[call.resource];

            let metas = this.imetadata.eventMetadata[key];
            let handlers = this.eventHandlers && this.eventHandlers[key];
            if (!handlers && alias) {
                let key2 = `${call.source} ${alias}`;
                metas = this.imetadata.eventMetadata[key2];
                handlers = this.eventHandlers && this.eventHandlers[key2];
            }
            if (!handlers) throw this.log.error(new NotFound(`Event handler not found [${key}] [${call.object}]`));

            let result: EventResult = {
                status: null,
                source: call.source,
                action: call.action,
                resource: call.resource,
                object: call.object,
                returns: []
            };

            this.istate = ContainerState.Busy;
            for (let i = 0; i < handlers.length; i++) {
                let handler = handlers[i];
                let target = metas[i];
                if (!Utils.wildcardMatch(target.actionFilter, call.action) || !Utils.wildcardMatch(target.objectFilter, call.object)) continue;

                call.application = this.application;
                call.service = target.service;
                call.method = target.method;

                let permissionId = call.service + "." + call.method;
                let permission = permissionId && this.imetadata.permissions[permissionId];
                if (permission == null) throw this.log.error(new Forbidden(`Undefined permission for method [${permissionId}]`));

                let ctx = await this.security.eventAuth(call, permission);

                try {
                    await this.activate(ctx);
                    for (let record of call.records) {
                        call.record = record;
                        let data = await handler(ctx, call);
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

    public async restCall(call: RestCall): Promise<RestResult> {
        if (this.istate !== ContainerState.Ready) throw new InternalServerError("Invalid container state");

        this.istate = ContainerState.Reserved;
        try {
            call.type = "rest";
            this.log.debug("REST Event: %j", call);

            call.contentType = RestUtils.contentType(call.headers, call.body);

            let key = `${call.httpMethod} ${call.resource}`;
            if (call.contentType.domainModel) key += `:${call.contentType.domainModel}`;
            let rester = this.restHandlers && this.restHandlers[key];
            if (!rester) throw this.log.error(new NotFound(`Route not found [${key}]`));

            let target = this.imetadata.restMetadata[key];

            call.application = this.application;
            call.service = target.service;
            call.method = target.method;

            let permissionId = call.service + "." + call.method;
            let permission = permissionId && this.imetadata.permissions[permissionId];
            if (permission == null) throw this.log.error(new Forbidden(`Undefined permission for method [${permissionId}]`));

            this.istate = ContainerState.Busy;
            let ctx = await this.security.restAuth(call, permission);

            try {
                await this.activate(ctx);

                RestUtils.body(call);

                this.log.debug("REST Context: %j", ctx);
                this.log.debug("REST Call: %j", call);

                let result: [number, any, string] = await rester(ctx, call);
                if (result[2] === "RAW") { // TODO: Verbatim response ...
                    return this.enrich(result[1], ctx, call);
                } else {
                    let resp: RestResult = { statusCode: result[0] as HttpCode, body: result[1], contentType: result[2] };
                    this.log.debug("Response: %j", resp);
                    return this.enrich(resp, ctx, call);
                }
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

    private enrich(result: RestResult, ctx: Context, call: RestCall): RestResult {
        if (ctx && ctx.renewed && ctx.token) {
            result.headers = result.headers || {};
            result.headers["Token"] = ctx.token;
        }
        return result;
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


