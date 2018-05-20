import { HttpMetadata, ServiceMetadata } from "../metadata";
import { ArgBinder, ContextBinder, HttpAdapter, HttpCode, HttpMethod, HttpResponse, RequestBinder } from "../types";

/////////// Method Decorators //////////////////////////////////////////////////////////////////

export function Get(route: string, adapter?: HttpAdapter) {
    return HttpMethod("GET", route, false, 200, adapter);
}

export function Post(route: string, model?: boolean | string, adapter?: HttpAdapter) {
    return HttpMethod("POST", route, model, 200, adapter);
}

export function Put(route: string, model?: boolean | string, adapter?: HttpAdapter) {
    return HttpMethod("PUT", route, model, 200, adapter);
}

export function Delete(route: string, model?: boolean | string, adapter?: HttpAdapter) {
    return HttpMethod("DELETE", route, model, 200, adapter);
}

export function Patch(route: string, model?: boolean | string, adapter?: HttpAdapter) {
    return HttpMethod("PATCH", route, model, 200, adapter);
}

// Decorator
function HttpMethod(verb: HttpMethod, resource: string, model: boolean | string, code: HttpCode, adapter?: HttpAdapter) {
    return function (type: any, propertyKey: string, descriptor: PropertyDescriptor) {
        if (!model) model = null;
        else if (model === true) model = propertyKey;
        else model = model.toString();

        let route = `${verb} ${resource}`;
        let meta: HttpMetadata = {
            service: undefined,
            route,
            method: propertyKey,
            verb,
            resource,
            model: model as string,
            code,
            adapter
        };

        let metadata = ServiceMetadata.get(type);
        if (model) {
            let modelRoute = `${route}:${model}`;
            if (metadata.httpMetadata[modelRoute]) throw new Error(`Duplicate route: ${modelRoute}`);
            metadata.httpMetadata[modelRoute] = meta;
        } else {
            if (metadata.httpMetadata[route]) throw new Error(`Duplicate route: ${route}`);
            metadata.httpMetadata[route] = meta;
        }
    };
}

/////////// Parameter Decorators //////////////////////////////////////////////////////////////////

export function PathParam(param: string) {
    return ArgBinding(PathParam.name, param, (ctx, req) => req.pathParameters[param]);
}

export function PathParams() {
    return ArgBinding(PathParams.name, "*", (ctx, req) => req.pathParameters);
}

export function QueryParam(param: string) {
    return ArgBinding(QueryParam.name, param, (ctx, req) => req.queryStringParameters[param]);
}

export function QueryParams() {
    return ArgBinding(QueryParams.name, "*", (ctx, req) => req.queryStringParameters);
}

export function BodyParam(param: string) {
    return ArgBinding(BodyParam.name, param, (ctx, req) => resolvePath(req.json, param));
}

export function HeaderParam(param: string) {
    return ArgBinding(HeaderParam.name, param, (ctx, req) => req.headers[("" + param).toLowerCase()]);
}

// export function CookieParam(param: string) {}

export function Body() {
    return ArgBinding(Body.name, null, (ctx, req) => req.json);
}

export function ContextObject() {
    return ArgBinding(ContextObject.name, null, (ctx, req) => ctx);
}

export function ContextParam(param: string | ContextBinder) {
    return ArgBinding(ContextParam.name,
        param instanceof Function ? "[Function]" : param,
        (ctx, req) => resolvePath(ctx, param));
}

export function RequestObject() {
    return ArgBinding(RequestObject.name, null, (ctx, req) => req);
}

export function RequestParam(param: string | RequestBinder) {
    return ArgBinding(RequestParam.name,
        param instanceof Function ? "[Function]" : param,
        (ctx, req) => resolvePath(req, param));
}

function ArgBinding(type: string, param: string, binder: ArgBinder) {
    return function (target: Object, propertyName: string, index: number) {
        let metadata = ServiceMetadata.get(target);
        metadata.bindingMetadata[propertyName] = metadata.bindingMetadata[propertyName] || {
            method: propertyName,
            contentType: undefined,
            argBindings: []
        };
        metadata.bindingMetadata[propertyName].argBindings[index] = {
            type,
            index,
            param,
            binder
        };
    };
}

export function ContentType(type: string | typeof HttpResponse) {
    return function (target: Object, propertyName: string, descriptor: PropertyDescriptor) {
        let metadata = ServiceMetadata.get(target);
        metadata.bindingMetadata[propertyName] = metadata.bindingMetadata[propertyName] || {
            method: propertyName,
            contentType: type,
            argBindings: []
        };
        metadata.bindingMetadata[propertyName].contentType = type;
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