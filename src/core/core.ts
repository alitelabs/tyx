import { BaseConfiguration, Configuration, DefaultConfiguration, DefaultSecurity, Security } from "../core";
import { Proxy, Service } from "../decorators";
import { Forbidden, InternalServerError, NotFound } from "../errors";
import { Di, Orm } from "../import";
import { Logger } from "../logger";
import { ApiMetadata, Metadata, MethodMetadata, ProxyMetadata, ServiceMetadata } from "../metadata";
import { Class, ContainerState, Context, EventHandler, EventRequest, EventResult, HttpHandler, HttpRequest, HttpResponse, ObjectType, RemoteHandler, RemoteRequest } from "../types";
import { HttpUtils, Utils } from "../utils";

const SINGLETON = true;
Orm.useContainer(Di.Container);

export class Core {
    private application: string;
    private name: string;

    protected log: Logger;

    public config: Configuration;
    public security: Security;

    private istate: ContainerState;

    private resources: Record<string, any>;
    public services: Record<string, Service>;
    private proxies: Record<string, Proxy>;

    private remoteHandlers: Record<string, RemoteHandler>;
    private httpHandlers: Record<string, HttpHandler>;
    private eventHandlers: Record<string, EventHandler[]>;

    private prepared: boolean;

    constructor(application: string, name: string) {
        this.application = application;
        this.name = name || Core.name;

        this.log = Logger.get(this.application, this.name);
        this.istate = ContainerState.Pending;
        this.resources = {};
        this.services = {};
        this.proxies = {};
        this.remoteHandlers = {};
        this.httpHandlers = {};
        this.eventHandlers = {};
    }

    public get state() {
        return this.istate;
    }

    public get<T>(type: ObjectType<T> | string): T {
        if (type === Configuration) return this.config as any;
        if (type === Security) return this.config as any;
        if (typeof type === "string") return this.services[type] || this.proxies[type] || this.resources[type];
        let proxy = ProxyMetadata.get(type);
        if (proxy) return this.proxies[proxy.alias] as any;
        let service = ServiceMetadata.get(type);
        if (service) return this.services[service.alias] as any;
        return null;
    }

    public register(target: Object | Class): this {
        if (!SINGLETON && this.istate !== ContainerState.Pending) throw new InternalServerError("Invalid container state");

        let name: string = undefined;

        if (target instanceof Function) {
            // target = new (target as new (...args: any[]) => any)(...args);
            let meta = ServiceMetadata.get(target);
            target = Di.Container.get(meta.alias) as Service;
        }

        let id: string;
        if (name) {
            id = name = "" + name;
        } else if (ServiceMetadata.has(target)) {
            let meta = ServiceMetadata.get(target);
            id = name = meta.alias;
        } else if (ProxyMetadata.has(target)) {
            let meta = ProxyMetadata.get(target);
            name = meta.alias;
            id = (meta.application || this.application) + ":" + meta.alias;
        } else {
            id = name = target.constructor.name;
        }

        let prev = (this.services[id] || this.proxies[id] || this.resources[id]);
        if (prev && prev !== target)
            throw new InternalServerError(`Duplicate registration [${id}]`);

        if (name === Configuration) {
            if (!ServiceMetadata.has(target)) throw new InternalServerError(`Configuration must be a service`);
            this.config = target as Configuration;
            if (target instanceof BaseConfiguration) {
                target.init(this.application);
            }
        }
        if (name === Security) {
            if (!ServiceMetadata.has(target)) throw new InternalServerError(`Security must be a service`);
            this.security = target as Security;
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

    public publish(type: Class): this {
        if (!SINGLETON && this.istate !== ContainerState.Pending) throw new InternalServerError("Invalid container state");

        let meta = ServiceMetadata.get(type);
        if (!meta) throw new InternalServerError(`Service decoration missing`);
        if (!ApiMetadata.has(type)) throw new InternalServerError(`Api not defined on service`);
        let di = Di.Container;
        let service = di.get(meta.alias) as Service;
        this.register(service);

        // let metaService = ServiceMetadata.get(service);
        let metaApi = ApiMetadata.get(service);
        this.log.info("Publish: %s", metaApi.alias);

        for (let meta of Object.values(metaApi.methods)) {
            let key = meta.service + "." + meta.name;
            if (!meta.roles.Internal && !meta.roles.External && !meta.roles.Remote) continue;
            this.remoteHandlers[key] = this.remoteHandler(service, meta);
        }

        for (let [route, meta] of Object.entries(metaApi.routes)) {
            this.httpHandlers[route] = this.httpHandler(service, meta, route);
        }

        for (let [route, metas] of Object.entries(metaApi.events)) {
            let handlers = metas.map(m => this.eventHandler(service, m, route));
            this.eventHandlers[route] = this.eventHandlers[route] || [];
            this.eventHandlers[route] = this.eventHandlers[route].concat(handlers);
        }
        return this;
    }

    private remoteHandler(service: Service, metadata: MethodMetadata): RemoteHandler {
        let fun: RemoteHandler = async (ctx: Context, req: RemoteRequest): Promise<any> => {
            let log: Logger = service.log || this.log;
            let startTime = log.time();
            try {
                let method: Function = service[metadata.name];
                let result = await method.apply(service, req.args);
                return result;
            } catch (e) {
                throw e;
            } finally {
                log.timeEnd(startTime, `${metadata.name}`);
            }
        };
        return fun;
    }

    private httpHandler(service: Service, metadata: MethodMetadata, route: string): HttpHandler {
        let fun: HttpHandler = async (ctx: Context, req: HttpRequest): Promise<HttpResponse> => {
            let log: Logger = service.log || this.log;
            let startTime = log.time();
            try {
                let method: Function = service[metadata.name];
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
                log.timeEnd(startTime, `${metadata.name}`);
            }
        };
        return fun;
    }

    private eventHandler(service: Service, metadata: MethodMetadata, route: string): EventHandler {
        let handler: EventHandler = async (ctx: Context, req: EventRequest): Promise<any> => {
            let log: Logger = service.log || this.log;
            let startTime = log.time();
            try {
                let result: Promise<any>;
                let method: Function = service[metadata.name];
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
                log.timeEnd(startTime, `${metadata.name}`);
            }
        };
        return handler;
    }

    public async prepare(): Promise<this> {
        if (!SINGLETON && this.istate !== ContainerState.Pending) throw new InternalServerError("Invalid container state");

        if (this.prepared) return this;
        await this.initConnection();
        if (!this.config) {
            this.register(new DefaultConfiguration());
            this.log.warn("Using default configuration service!");
        }
        if (!this.security) {
            this.register(new DefaultSecurity());
            this.log.warn("Using default security service!");
        }
        this.istate = ContainerState.Ready;
        this.prepared = true;
        return this;
    }

    public async initConnection(): Promise<void> {
        let cfg: string = process.env.DATABASE;
        // this.label = options.substring(options.indexOf("@") + 1);
        let tokens = cfg.split(/:|@|\/|;/);
        let logQueries = tokens.findIndex(x => x === "logall") > 5;
        // let name = (this.config && this.config.appId || "tyx") + "#" + (++DatabaseProvider.instances);
        let options: Orm.ConnectionOptions = {
            name: "default",
            username: tokens[0],
            password: tokens[1],
            type: tokens[2] as any,
            host: tokens[3],
            port: +tokens[4],
            database: tokens[5],
            // timezone: "Z",
            logging: logQueries ? "all" : ["error"],
            entities: Object.values(Metadata.entities).map(meta => meta.target)
        };
        await Orm.createConnection(options);
    }

    // --------------------------------------------------

    public async remoteRequest(req: RemoteRequest): Promise<any> {
        if (!SINGLETON && this.istate !== ContainerState.Ready) throw new InternalServerError("Invalid container state");
        this.istate = ContainerState.Reserved;
        try {
            this.log.debug("Remote Request: %j", req);

            if (req.application !== this.application) {
                throw this.log.error(new NotFound(`Application not found [${req.application}]`));
            }

            let service = this.services[req.service];
            if (!service) throw this.log.error(new NotFound(`Service not found [${req.service}]`));

            let permissionId = req.service + "." + req.method;
            let permission = permissionId && Metadata.methods[permissionId] as MethodMetadata;
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
        if (!SINGLETON && this.istate !== ContainerState.Ready) throw new InternalServerError("Invalid container state");
        this.istate = ContainerState.Reserved;
        try {
            req.type = "event";
            this.log.debug("Event Request: %j", req);

            let route = `${req.source} ${req.resource}`;
            let alias = this.config.resources && this.config.resources[req.resource];

            let metas = Metadata.events[route];
            let handlers = this.eventHandlers && this.eventHandlers[route];
            if (!handlers && alias) {
                route = `${req.source} ${alias}`;
                metas = Metadata.events[route];
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
                let permission = permissionId && Metadata.methods[permissionId] as MethodMetadata;
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
        if (!SINGLETON && this.istate !== ContainerState.Ready) throw new InternalServerError("Invalid container state");
        this.istate = ContainerState.Reserved;
        try {
            req.type = "http";
            this.log.debug("HTTP Event: %j", req);

            HttpUtils.request(req);

            let key = `${req.httpMethod} ${req.resource}`;
            if (req.contentType.domainModel) key += `:${req.contentType.domainModel}`;
            let handler = this.httpHandlers && this.httpHandlers[key];
            if (!handler) throw this.log.error(new NotFound(`Route not found [${key}]`));

            let target = Metadata.routes[key];

            req.application = this.application;
            req.service = target.service;
            req.method = target.method;

            let permissionId = req.service + "." + req.method;
            let permission = permissionId && Metadata.methods[permissionId] as MethodMetadata;
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


