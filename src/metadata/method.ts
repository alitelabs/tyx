import { Class, Context, Prototype } from "../types/core";
import { EventAdapter } from "../types/event";
import { HttpCode, HttpRequest } from "../types/http";
import { Roles } from "../types/security";
import * as Utils from "../utils/misc";
import { ApiMetadata } from "./api";
import { Registry } from "./registry";
import { GraphMetadata, GraphType } from "./type";

export enum HttpBindingType {
    PathParam = "PathParam",
    PathParams = "PathParams",
    QueryParam = "QueryParam",
    QueryParams = "QueryParams",
    HeaderParam = "HeaderParam",
    BodyParam = "BodyParam",
    ContextParam = "ContextParam",
    // Objects
    Body = "Body",
    ContextObject = "ContextObject",
    RequestObject = "RequestObject",
    RequestParam = "RequestParam"
}

export type ContextBinder = (ctx: Context) => any;
export type RequestBinder = (req: HttpRequest) => any;
export type HttpBinder = (ctx: Context, req: HttpRequest) => any;

export type DesignMetadata = {
    name?: string;
    type: string;
    target: Function;
};

export type HttpAdapter = (
    next: (...args: any[]) => Promise<any>,
    ctx?: Context,
    req?: HttpRequest,
    path?: Record<string, string>,
    query?: Record<string, string>
) => Promise<any>;


export interface HttpBindingMetadata {
    type: HttpBindingType;
    path: string;
    binder: HttpBinder;
}

export interface HttpRouteMetadata {
    target: Class;
    routeId: string;
    serviceId: string;
    methodId: string;
    // route: string;
    verb: string;
    resource: string;
    model: string;
    code: HttpCode;
    adapter: HttpAdapter;
    // Relations
    // api: ApiMetadata;
    // method: MethodMetadata;
}

export interface EventRouteMetadata {
    target: Class;
    eventId: string;
    serviceId: string;
    methodId: string;
    source: string;
    resource: string;
    objectFilter: string;
    actionFilter: string;
    adapter: EventAdapter;
}

export interface IMethodMetadata {
    target: Class;
    methodId: string;
    serviceId: string;
    design: DesignMetadata[];

    auth: string;
    roles: Roles;

    query: boolean;
    mutation: boolean;
    input: GraphMetadata;
    result: GraphMetadata;

    contentType: string;
    bindings: HttpBindingMetadata[];
    http: Record<string, HttpRouteMetadata>;
    events: Record<string, EventRouteMetadata>;
}

export class MethodMetadata implements IMethodMetadata {

    public target: Class;

    public serviceId: string = undefined;
    public methodId: string;
    public design: DesignMetadata[] = undefined;

    public auth: string = undefined;
    public roles: Roles = undefined;

    public query: boolean = undefined;
    public mutation: boolean = undefined;
    public input: GraphMetadata = undefined;
    public result: GraphMetadata = undefined;

    public contentType: string = undefined;
    public bindings: HttpBindingMetadata[] = undefined;
    public http: Record<string, HttpRouteMetadata> = undefined;
    public events: Record<string, EventRouteMetadata> = undefined;

    private constructor(target: Prototype, method: string) {
        this.target = target.constructor;
        this.methodId = method;
    }

    public static has(target: Prototype, propertyKey: string): boolean {
        return Reflect.hasMetadata(Registry.TYX_METHOD, target, propertyKey);
    }

    public static get(target: Prototype, propertyKey: string): MethodMetadata {
        return Reflect.getMetadata(Registry.TYX_METHOD, target, propertyKey);
    }

    public static define(target: Prototype, propertyKey: string, descriptor?: PropertyDescriptor): MethodMetadata {
        let meta = MethodMetadata.get(target, propertyKey);
        let ret = meta && meta.design && meta.design[meta.design.length - 1];
        if (ret && ret.name === "#return") return meta;
        if (!meta) {
            meta = new MethodMetadata(target, propertyKey);
            Reflect.defineMetadata(Registry.TYX_METHOD, meta, target, propertyKey);
        }
        let names = descriptor ? Utils.getArgs(descriptor.value as any) : [];
        let params: any[] = Reflect.getMetadata(Registry.DESIGN_PARAMS, target, propertyKey);
        let returns = Reflect.getMetadata(Registry.DESIGN_RETURN, target, propertyKey);
        meta.design = meta.design || [];
        params.forEach((param, i) => meta.design[i] = { name: names[i], type: param.name, target: param });
        meta.design[params.length] = { name: descriptor ? "#return" : undefined, type: returns.name, target: returns };
        ApiMetadata.define(target).addMethod(meta);
        return meta;
    }

    public addAuth(auth: string, roles: Roles): this {
        this.auth = auth;
        roles = this.roles = { ...this.roles, ...roles };
        roles.Internal = roles.Internal === undefined ? true : !!roles.Internal;
        roles.External = roles.External === undefined ? false : !!roles.External;
        roles.Remote = roles.Remote === undefined ? true : !!roles.Internal;
        return this;
    }

    public setQuery(input?: Class, result?: Class): this {
        this.query = true;
        this.input = input ? { type: GraphType.Ref, target: input } : { type: GraphType.ANY };
        this.result = result ? { type: GraphType.Ref, target: result } : { type: GraphType.ANY };
        return this;
    }

    public setMutation(input?: Class, result?: Class): this {
        this.mutation = true;
        this.input = input ? { type: GraphType.Ref, target: input } : { type: GraphType.ANY };
        this.result = result ? { type: GraphType.Ref, target: result } : { type: GraphType.ANY };
        return this;
    }

    public setContentType(type: string): this {
        this.contentType = type;
        return this;
    }

    public addRoute(verb: string, resource: string, model: string, code: HttpCode, adapter?: HttpAdapter): this {
        let meta = this;
        let routeId = `${verb} ${resource}`;
        routeId += model ? `:${model}` : "";
        meta.http = meta.http || {};
        if (this.http[routeId]) throw new TypeError(`Duplicate HTTP route: [${routeId}]`);
        let route: HttpRouteMetadata = {
            target: this.target,
            routeId,
            serviceId: this.serviceId,
            methodId: this.methodId,
            verb,
            resource,
            model,
            code,
            adapter,
            // api: () => this.service,
            // method: () => this
        };
        ApiMetadata.define(this.target).addRoute(route);
        meta.http[routeId] = route;
        return this;
    }

    public addBinding(index: number, type: HttpBindingType, path: string, binder: HttpBinder): this {
        this.bindings = this.bindings || [];
        this.bindings[index] = {
            ...this.bindings[index],
            type,
            path,
            binder
        };
        return this;
    }

    public addEvent(source: string, resource: string, actionFilter: string | boolean, objectFilter: string, adapter: EventAdapter): this {
        let route = `${source} ${resource}`;
        actionFilter = actionFilter === true ? this.methodId : actionFilter;
        actionFilter = actionFilter || "*";
        objectFilter = objectFilter || "*";
        this.events = this.events || {};
        if (this.events[route]) throw new TypeError(`Duplicate event route: [${route}]`);
        let event: EventRouteMetadata = {
            target: this.target,
            eventId: route,
            serviceId: this.serviceId,
            methodId: this.methodId,
            source,
            resource,
            actionFilter,
            objectFilter,
            adapter
        };
        this.events[route] = event;
        this.addAuth("internal", { Internal: true, External: false, Remote: false });
        ApiMetadata.define(this.target).addEvent(event);
        return this;
    }

    public commit(api: ApiMetadata): this {
        this.serviceId = api.alias;
        Registry.MethodMetadata[this.serviceId + "." + this.methodId] = this;
        if (this.http) for (let [route, meta] of Object.entries(this.http)) {
            meta.serviceId = this.serviceId;
            if (Registry.HttpRouteMetadata[route] && Registry.HttpRouteMetadata[route] !== meta)
                throw new TypeError(`Duplicate HTTP route [${route}]`);
            Registry.HttpRouteMetadata[route] = meta;
        }
        if (this.events) for (let [route, meta] of Object.entries(this.events)) {
            meta.serviceId = this.serviceId;
            let handlers = Registry.EventRouteMetadata[route] = Registry.EventRouteMetadata[route] || [];
            if (!handlers.includes(meta)) handlers.push(meta);
        }
        return this;
    }
}

