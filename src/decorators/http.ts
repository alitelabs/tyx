import { HttpMetadata, ServiceMetadata } from "../metadata";
import { ArgBinder, ContextBinder, HttpAdapter, HttpCode, HttpMethod, HttpResponse, RequestBinder } from "../types";

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
    return (target: Object, propertyKey: string, descriptor: PropertyDescriptor) => {
        if (!model) model = undefined;
        else if (model === true) model = propertyKey;
        else model = model.toString();
        model = model as string;
        let route = `${verb} ${resource}`;
        let modelRoute = model ? `${route}:${model}` : route;

        let meta = HttpMetadata.define(target, propertyKey);
        meta.routes[modelRoute] = {
            verb,
            resource,
            model,
            code,
            adapter
        };

        // ==== TODO REMOVE =============
        let old: HttpMetadata = {
            service: undefined,
            route,
            method: propertyKey,
            verb,
            resource,
            model,
            code,
            adapter
        };
        let metadata = ServiceMetadata.get(target);
        if (metadata.httpMetadata[modelRoute]) throw new Error(`Duplicate route: ${modelRoute}`);
        metadata.httpMetadata[modelRoute] = old;
    };
}

/////////// Parameter Decorators //////////////////////////////////////////////////////////////////

export function PathParam(param: string): ParameterDecorator {
    return ArgBinding(PathParam.name, param, (ctx, req) => req.pathParameters[param]);
}

export function PathParams(): ParameterDecorator {
    return ArgBinding(PathParams.name, "*", (ctx, req) => req.pathParameters);
}

export function QueryParam(param: string): ParameterDecorator {
    return ArgBinding(QueryParam.name, param, (ctx, req) => req.queryStringParameters[param]);
}

export function QueryParams(): ParameterDecorator {
    return ArgBinding(QueryParams.name, "*", (ctx, req) => req.queryStringParameters);
}

export function BodyParam(param: string): ParameterDecorator {
    return ArgBinding(BodyParam.name, param, (ctx, req) => resolvePath(req.json, param));
}

export function HeaderParam(param: string): ParameterDecorator {
    return ArgBinding(HeaderParam.name, param, (ctx, req) => req.headers[("" + param).toLowerCase()]);
}

// export function CookieParam(param: string) {}

export function Body(): ParameterDecorator {
    return ArgBinding(Body.name, undefined, (ctx, req) => req.json);
}

export function ContextObject(): ParameterDecorator {
    return ArgBinding(ContextObject.name, undefined, (ctx, req) => ctx);
}

export function ContextParam(param: string | ContextBinder): ParameterDecorator {
    return ArgBinding(ContextParam.name,
        param instanceof Function ? "[Function]" : param,
        (ctx, req) => resolvePath(ctx, param));
}

export function RequestObject(): ParameterDecorator {
    return ArgBinding(RequestObject.name, undefined, (ctx, req) => req);
}

export function RequestParam(param: string | RequestBinder): ParameterDecorator {
    return ArgBinding(RequestParam.name,
        param instanceof Function ? "[Function]" : param,
        (ctx, req) => resolvePath(req, param));
}

function ArgBinding(type: string, param: string, binder: ArgBinder): ParameterDecorator {
    return function (target: Object, propertyKey: string, index: number) {
        let meta = HttpMetadata.define(target, propertyKey);
        // TODO: Multi binding
        meta.bindings[index] = {
            // index,
            type,
            param,
            binder
        };
        // ==== TODO REMOVE =============
        let metadata = ServiceMetadata.get(target);
        metadata.bindingMetadata[propertyKey] = metadata.bindingMetadata[propertyKey] || {
            method: propertyKey,
            contentType: undefined,
            argBindings: []
        };
        metadata.bindingMetadata[propertyKey].argBindings[index] = {
            type,
            index,
            param,
            binder
        };
    };
}

export function ContentType(contentType: string | typeof HttpResponse): MethodDecorator {
    return function (target: Object, propertyKey: string, descriptor: PropertyDescriptor) {
        let meta = HttpMetadata.define(target, propertyKey, descriptor);
        meta.contentType = contentType;
        // ==== TODO REMOVE =============
        let metadata = ServiceMetadata.get(target);
        metadata.bindingMetadata[propertyKey] = metadata.bindingMetadata[propertyKey] || {
            method: propertyKey,
            contentType: contentType,
            argBindings: []
        };
        metadata.bindingMetadata[propertyKey].contentType = contentType;
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