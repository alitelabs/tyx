import { Context, HttpCode, HttpMethod, HttpRequest, HttpResponse } from "../types";
import { ApiMetadata } from "./api";
import { MethodMetadata } from "./method";

// -- Types

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

export type HttpAdapter = (
    next: (...args: any[]) => Promise<any>,
    ctx?: Context,
    req?: HttpRequest,
    path?: Record<string, string>,
    query?: Record<string, string>
) => Promise<any>;
export type ContextBinder = (ctx: Context) => any;
export type RequestBinder = (req: HttpRequest) => any;
export type HttpBinder = (ctx: Context, req: HttpRequest) => any;

/////////// Method Decorators //////////////////////////////////////////////////////////////////

export function Get(route: string, adapter?: HttpAdapter): MethodDecorator {
    return HttpMethod("GET", route, false, 200, adapter);
}

export function Post(route: string, model?: boolean | string, adapter?: HttpAdapter): MethodDecorator {
    return HttpMethod("POST", route, model, 200, adapter);
}

export function Put(route: string, model?: boolean | string, adapter?: HttpAdapter): MethodDecorator {
    return HttpMethod("PUT", route, model, 200, adapter);
}

export function Delete(route: string, model?: boolean | string, adapter?: HttpAdapter): MethodDecorator {
    return HttpMethod("DELETE", route, model, 200, adapter);
}

export function Patch(route: string, model?: boolean | string, adapter?: HttpAdapter): MethodDecorator {
    return HttpMethod("PATCH", route, model, 200, adapter);
}

// Decorator
function HttpMethod(verb: HttpMethod, resource: string, model: boolean | string, code: HttpCode, adapter?: HttpAdapter): MethodDecorator {
    return (target, propertyKey, descriptor) => {
        if (typeof propertyKey !== "string") throw new TypeError("propertyKey must be string");
        if (!model) model = undefined;
        else if (model === true) model = propertyKey;
        else model = model.toString();
        model = model as string;
        let route = `${verb} ${resource}`;
        route = model ? `${route}:${model}` : route;
        let meta = HttpMetadata.init(target, propertyKey);
        meta.http[route] = {
            verb,
            resource,
            model,
            code,
            adapter
        };
        let metadata = ApiMetadata.init(target.constructor);
        if (metadata.httpMetadata[route]) throw new Error(`Duplicate route: ${route}`);
        metadata.httpMetadata[route] = meta;
    };
}

/////////// Parameter Decorators //////////////////////////////////////////////////////////////////

export function PathParam(param: string): ParameterDecorator {
    return HttpBinding(HttpBindingType.PathParam, param, (ctx, req) => req.pathParameters[param]);
}

export function PathParams(): ParameterDecorator {
    return HttpBinding(HttpBindingType.PathParams, "*", (ctx, req) => req.pathParameters);
}

export function QueryParam(param: string): ParameterDecorator {
    return HttpBinding(HttpBindingType.QueryParam, param, (ctx, req) => req.queryStringParameters[param]);
}

export function QueryParams(): ParameterDecorator {
    return HttpBinding(HttpBindingType.QueryParams, "*", (ctx, req) => req.queryStringParameters);
}

export function BodyParam(param: string): ParameterDecorator {
    return HttpBinding(HttpBindingType.BodyParam, param, (ctx, req) => resolvePath(req.json, param));
}

export function HeaderParam(param: string): ParameterDecorator {
    return HttpBinding(HttpBindingType.HeaderParam, param, (ctx, req) => req.headers[("" + param).toLowerCase()]);
}

// export function CookieParam(param: string) {}

export function Body(): ParameterDecorator {
    return HttpBinding(HttpBindingType.Body, undefined, (ctx, req) => req.json);
}

export function ContextObject(): ParameterDecorator {
    return HttpBinding(HttpBindingType.ContextObject, undefined, (ctx, req) => ctx);
}

export function ContextParam(param: string | ContextBinder): ParameterDecorator {
    return HttpBinding(HttpBindingType.ContextParam,
        param instanceof Function ? "[Function]" : param,
        (ctx, req) => resolvePath(ctx, param));
}

export function RequestObject(): ParameterDecorator {
    return HttpBinding(HttpBindingType.RequestObject, undefined, (ctx, req) => req);
}

export function RequestParam(param: string | RequestBinder): ParameterDecorator {
    return HttpBinding(HttpBindingType.RequestParam,
        param instanceof Function ? "[Function]" : param,
        (ctx, req) => resolvePath(req, param));
}

function HttpBinding(type: HttpBindingType, param: string, binder: HttpBinder): ParameterDecorator {
    return function (target, propertyKey, index) {
        if (typeof propertyKey !== "string") throw new TypeError("propertyKey must be string");
        let meta = HttpMetadata.init(target, propertyKey);
        meta.bindings[index] = {
            ...meta.bindings[index],
            type,
            param,
            binder
        };
    };
}

export function ContentType(contentType: string | typeof HttpResponse): MethodDecorator {
    return function (target, propertyKey, descriptor) {
        if (typeof propertyKey !== "string") throw new TypeError("propertyKey must be string");
        let meta = HttpMetadata.init(target, propertyKey, descriptor);
        meta.contentType = contentType;
    };
}

export function resolvePath(root: any, param: Function | string): any {
    if (typeof param === "function") return param(root);
    if (!param) return undefined;
    param = param.toString();
    let path = param.split(".");
    let val = root;
    for (let p of path) {
        val = val && val[p];
    }
    return val;
}

export interface HttpMetadata extends MethodMetadata {
    bindings: HttpBindingMetadata[];
    contentType?: string;
    http: Record<string, HttpRouteMetadata>;
}

export interface HttpBindingMetadata {
    type: HttpBindingType;
    param: string;
    binder: HttpBinder;
}

export interface HttpRouteMetadata {
    // route: string;
    verb: string;
    resource: string;
    model: string;
    code: HttpCode;
    adapter: HttpAdapter;
}

export namespace HttpMetadata {
    export function has(target: Object, propertyKey: string): boolean {
        return !!get(target, propertyKey);
    }

    export function get(target: Object, propertyKey: string): HttpMetadata {
        let meta = MethodMetadata.get(target, propertyKey) as HttpMetadata;
        return meta && meta.http && meta;
    }

    export function init(target: Object, propertyKey: string, descriptor?: PropertyDescriptor): HttpMetadata {
        let method = MethodMetadata.define(target, propertyKey, descriptor) as HttpMetadata;
        method.bindings = method.bindings || [];
        method.http = method.http || {};
        return method;
    }
}