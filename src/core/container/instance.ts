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
    private _application: string;
    private _name: string;

    protected log: Logger;

    protected config: Configuration;
    protected security: Security;

    private _state: ContainerState;

    private _resources: Record<string, any>;
    private _services: Record<string, Service>;
    private _proxies: Record<string, Proxy>;

    private _metadata: ContainerMetadata;

    private _remoteHandlers: Record<string, RemoteHandler>;
    private _restHandlers: Record<string, RestHandler>;
    private _eventHandlers: Record<string, EventHandler[]>;

    constructor(application: string, name: string, index?: string) {
        this._application = application;
        this._name = name || ContainerInstance.name;
        if (index !== undefined) this._name += ":" + index;

        this.log = Logger.get(this._application, this._name);
        this._state = ContainerState.Pending;
        this._resources = {};
        this._services = {};
        this._proxies = {};
        this._remoteHandlers = {};
        this._restHandlers = {};
        this._eventHandlers = {};
        this._metadata = {
            permissions: {},
            restMetadata: {},
            remoteMetadata: {},
            eventMetadata: {}
        };
    }

    public state(): ContainerState {
        return this._state;
    }

    public metadata(): ContainerMetadata {
        return this._metadata;
    }

    public get<T>(type: ObjectType<T> | string): T {
        if (type === Configuration) return this.config as any;
        if (type === Security) return this.config as any;
        if (typeof type === "string") return this._services[type] || this._proxies[type] || this._resources[type];
        if (ServiceMetadata.has(type)) return this._services[ServiceMetadata.service(type)] as any;
        if (ProxyMetadata.has(type)) return this._proxies[ProxyMetadata.service(type)] as any;
        return null;
    }

    public register(resource: Object, name?: string): this;
    public register(service: Service): this;
    public register(proxy: Proxy): this;
    public register(type: Function, ...args: any[]): this;
    public register(target: Object | Service | Proxy | Function, ...args: any[]): this {
        if (this._state !== ContainerState.Pending) throw new InternalServerError("Invalid container state");

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
            id = ProxyMetadata.id(target, this._application);
        } else {
            id = name = target.constructor.name;
        }

        if (this._services[id] || this._proxies[id] || this._resources[id]) throw new InternalServerError(`Duplicate registration [${id}]`);

        if (name === Configuration) {
            if (!ServiceMetadata.has(target)) throw new InternalServerError(`Configuration must be a service`);
            this.config = target as Configuration;
            if (target instanceof BaseConfiguration) {
                target.init(this._application);
            }
        }
        if (name === Security) {
            if (!ServiceMetadata.has(target)) throw new InternalServerError(`Security must be a service`);
            this.security = target as any;
        }

        if (ServiceMetadata.has(target)) {
            this._services[id] = target;
            this.log.info("Service: %s", id);
        } else if (ProxyMetadata.has(target)) {
            this._proxies[id] = target;
            this.log.info("Proxy: %s", id);
        } else {
            this._resources[id] = target;
            this.log.info("Resource: %s", id);
        }
        return this;
    }

    public publish(service: Function, ...args: any[]): this;
    public publish(service: Service): this;
    public publish(service: Service | Function, ...args: any[]): this {
        if (this._state !== ContainerState.Pending) throw new InternalServerError("Invalid container state");

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
            this._metadata.permissions[key] = meta;
        });

        let remoteMetadata = ServiceMetadata.remoteMetadata(service);
        let remotes = Object.keys(remoteMetadata);
        remotes.forEach(name => {
            let meta = remoteMetadata[name];
            let key = meta.service + "." + name;
            if (this._metadata.remoteMetadata[key]) throw new InternalServerError(`Duplicate service method [${key}]`);
            this._metadata.remoteMetadata[key] = meta;
            this._remoteHandlers[key] = this.remoteHandler(service as Service, meta);
        });

        let restMetadata = ServiceMetadata.restMetadata(service);
        let bindMetadata = ServiceMetadata.bindingMetadata(service);
        let routes = Object.keys(restMetadata);
        routes.forEach(route => {
            let meta = restMetadata[route];
            if (this._metadata.restMetadata[route]) throw new InternalServerError(`Duplicate REST route [${route}]`);
            this._metadata.restMetadata[route] = meta;
            let bindings = bindMetadata[meta.method];
            this._restHandlers[route] = this.restHandler(service as Service, meta, bindings);
        });

        let eventMetadata = ServiceMetadata.eventMetadata(service);
        let events = Object.keys(eventMetadata);
        events.forEach(event => {
            let metas = eventMetadata[event];
            this._metadata.eventMetadata[event] = this._metadata.eventMetadata[event].concat(metas);
            let handlers = metas.map(m => this.eventHandler(service as Service, m));
            this._eventHandlers[event] = this._eventHandlers[event] || [];
            this._eventHandlers[event] = this._eventHandlers[event].concat(handlers);
        });
        return this;
    }

    private remoteHandler(service: Service, metadata: RemoteMetadata): RemoteHandler {
        let fun: RemoteHandler = async function (ctx: Context, call: RemoteCall): Promise<any> {
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
        let fun: RestHandler = async function (ctx: Context, call: RestCall): Promise<[number, any, string]> {
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
        let handler: EventHandler = async function (ctx: Context, call: EventCall): Promise<any> {
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
        if (this._state !== ContainerState.Pending) throw new InternalServerError("Invalid container state");

        if (!this.config) {
            this.register(new DefaultConfiguration());
            this.log.warn("Using default configuration service!");
        }
        if (!this.security) {
            this.register(new DefaultSecurity());
            this.log.warn("Using default security service!");
        }

        for (let sid in this._services) {
            let service = this._services[sid];
            this.inject(service);
        }

        for (let pid in this._proxies) {
            let proxy = this._proxies[pid];
            if (proxy instanceof BaseProxy) {
                proxy.initialize(this.config, this.security);
            }
            this.inject(proxy);
        }

        this._state = ContainerState.Ready;

        return this;
    }

    private inject(service: Service) {
        let dependencies = Metadata.dependencies(service);
        for (let pid in dependencies) {
            let dep = dependencies[pid];
            let localId = dep.resource;
            let proxyId = (dep.application || this._application) + ":" + localId;
            let resolved = this._proxies[proxyId] || this._services[localId] || this._resources[localId];
            let depId = (dep.application ? dep.application + ":" : "") + localId;
            if (!resolved)
                throw new InternalServerError(`Unresolved dependency [${depId}] on [${service.constructor.name}.${pid}]`);
            this.log.info(`Resolved dependency [${depId}] on [${service.constructor.name}.${pid}]`);
            service[pid] = resolved;
        }
    }

    // --------------------------------------------------

    public async remoteCall(call: RemoteCall): Promise<any> {
        if (this._state !== ContainerState.Ready) throw new InternalServerError("Invalid container state");

        this._state = ContainerState.Reserved;
        try {
            this.log.debug("Remote Call: %j", call);

            if (call.application !== this._application) {
                throw this.log.error(new NotFound(`Application not found [${call.application}]`));
            }

            let service = this._services[call.service];
            if (!service) throw this.log.error(new NotFound(`Service not found [${call.service}]`));

            let permissionId = call.service + "." + call.method;
            let permission = permissionId && this._metadata.permissions[permissionId];
            if (permission == null) throw this.log.error(new Forbidden(`Undefined permission for method [${permissionId}]`));

            let caller: RemoteHandler = this._remoteHandlers[permissionId];
            if (!caller) throw this.log.error(new NotFound(`Method not found [${permissionId}]`));

            this._state = ContainerState.Busy;
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
            this._state = ContainerState.Ready;
        }
    }

    public async eventCall(call: EventCall): Promise<EventResult> {
        if (this._state !== ContainerState.Ready) throw new InternalServerError("Invalid container state");

        this._state = ContainerState.Reserved;
        try {
            call.type = "event";
            this.log.debug("Event Call: %j", call);

            let key = `${call.source} ${call.resource}`;
            let alias = this.config.resources && this.config.resources[call.resource];

            let metas = this._metadata.eventMetadata[key];
            let handlers = this._eventHandlers && this._eventHandlers[key];
            if (!handlers && alias) {
                let key2 = `${call.source} ${alias}`;
                metas = this._metadata.eventMetadata[key2];
                handlers = this._eventHandlers && this._eventHandlers[key2];
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

            this._state = ContainerState.Busy;
            for (let i = 0; i < handlers.length; i++) {
                let handler = handlers[i];
                let target = metas[i];
                if (!Utils.wildcardMatch(target.actionFilter, call.action) || !Utils.wildcardMatch(target.objectFilter, call.object)) continue;

                let serviceId = this._application + ":" + target.service;
                // let service = this._services[serviceId];

                call.application = this._application;
                call.service = target.service;
                call.method = target.method;

                let permissionId = serviceId + "." + call.method;
                let permission = permissionId && this._metadata.permissions[permissionId];
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
            this._state = ContainerState.Ready;
        }
    }

    public async restCall(call: RestCall): Promise<RestResult> {
        if (this._state !== ContainerState.Ready) throw new InternalServerError("Invalid container state");

        this._state = ContainerState.Reserved;
        try {
            call.type = "rest";
            this.log.debug("REST Event: %j", call);

            call.contentType = RestUtils.contentType(call.headers, call.body);

            let key = `${call.httpMethod} ${call.resource}`;
            if (call.contentType.domainModel) key += `:${call.contentType.domainModel}`;
            let rester = this._restHandlers && this._restHandlers[key];
            if (!rester) throw this.log.error(new NotFound(`Route not found [${key}]`));

            let target = this._metadata.restMetadata[key];

            call.application = this._application;
            call.service = target.service;
            call.method = target.method;

            let permissionId = target.service + "." + call.method;
            let permission = permissionId && this._metadata.permissions[permissionId];
            if (permission == null) throw this.log.error(new Forbidden(`Undefined permission for method [${permissionId}]`));

            this._state = ContainerState.Busy;
            let ctx = await this.security.restAuth(call, permission);

            try {
                await this.activate(ctx);

                RestUtils.body(call);

                this.log.debug("REST Context: %j", ctx);
                this.log.debug("REST Call: %j", call);

                let result: [number, any, string] = await rester(ctx, call);
                if (result[2] === "RAW") { // TODO: Verbatim response ...
                    return result[1];
                } else {
                    let resp: RestResult = { statusCode: result[0] as HttpCode, body: result[1], contentType: result[2] };
                    this.log.debug("Response: %j", resp);
                    return resp;
                }
            } catch (e) {
                this.log.error(e);
                throw InternalServerError.wrap(e);
            } finally {
                await this.release(ctx);
            }
        } finally {
            this._state = ContainerState.Ready;
        }
    }

    public async activate(ctx: Context): Promise<Context> {
        for (let sid in this._services) {
            let service = this._services[sid];
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
        for (let sid in this._services) {
            let service = this._services[sid];
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


