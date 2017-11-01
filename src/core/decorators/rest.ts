import "../env";

import {
    HttpCode,
    HttpMethod,
    RestAdapter,
    RestBinder,
    ContextBinder,
    CallBinder
} from "../types";

import {
    ServiceMetadata,
    RestMetadata
} from "../metadata";

/////////// Method Decorators //////////////////////////////////////////////////////////////////

export function Get(route: string, adapter?: RestAdapter) {
    return Rest("GET", route, false, 200, adapter);
}

export function Post(route: string, model?: boolean | string, adapter?: RestAdapter) {
    return Rest("POST", route, model, 201, adapter);
}

export function Put(route: string, model?: boolean | string, adapter?: RestAdapter) {
    return Rest("PUT", route, model, 201, adapter);
}

export function Delete(route: string, model?: boolean | string, adapter?: RestAdapter) {
    return Rest("DELETE", route, model, 200, adapter);
}

export function Patch(route: string, model?: boolean | string, adapter?: RestAdapter) {
    return Rest("PATCH", route, model, 200, adapter);
}

// Decorator
function Rest(verb: HttpMethod, resource: string, model: boolean | string, code: HttpCode, adapter?: RestAdapter) {
    return function (type: any, propertyKey: string, descriptor: PropertyDescriptor) {
        if (!model) model = null;
        else if (model === true) model = propertyKey;
        else model = model.toString();

        let route = `${verb} ${resource}`;
        let restMeta: RestMetadata = {
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
            if (metadata.restMetadata[modelRoute]) throw new Error(`Duplicate route: ${modelRoute}`);
            metadata.restMetadata[modelRoute] = restMeta;
        } else {
            if (metadata.restMetadata[route]) throw new Error(`Duplicate route: ${route}`);
            metadata.restMetadata[route] = restMeta;
        }
    };
}

/////////// Parameter Decorators //////////////////////////////////////////////////////////////////

export function PathParam(param: string) {
    return ArgBinding(PathParam.name, param, (ctx, call) => call.pathParameters[param]);
}

export function PathParams() {
    return ArgBinding(PathParams.name, "*", (ctx, call) => call.pathParameters);
}

export function QueryParam(param: string) {
    return ArgBinding(QueryParam.name, param, (ctx, call) => call.queryStringParameters[param]);
}

export function QueryParams() {
    return ArgBinding(QueryParams.name, "*", (ctx, call) => call.queryStringParameters);
}

export function BodyParam(param: string) {
    return ArgBinding(BodyParam.name, param, (ctx, call) => resolvePath(call.json, param));
}

export function HeaderParam(param: string) {
    // TODO: Case insensitive header names
    return ArgBinding(HeaderParam.name, param, (ctx, call) => call.headers[("" + param).toLowerCase()]);
}

// export function CookieParam(param: string) {}

export function Body() {
    return ArgBinding(Body.name, null, (ctx, call) => call.json);
}

export function ContextObject() {
    return ArgBinding(ContextObject.name, null, (ctx, call) => ctx);
}

export function ContextParam(param: string | ContextBinder) {
    return ArgBinding(ContextParam.name,
        param instanceof Function ? "[Function]" : param,
        (ctx, call) => resolvePath(ctx, param));
}

export function CallObject() {
    return ArgBinding(CallObject.name, null, (ctx, call) => call);
}

export function CallParam(param: string | CallBinder) {
    return ArgBinding(CallParam.name,
        param instanceof Function ? "[Function]" : param,
        (ctx, call) => resolvePath(call, param));
}

function ArgBinding(type: string, param: string, binder: RestBinder) {
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

export function ContentType(type: string) {
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

function resolvePath(root: any, param: Function | string): any {
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