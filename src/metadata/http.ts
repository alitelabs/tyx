import { HttpAdapter, HttpBinder, HttpBindingType, HttpCode } from "../types";
import { MethodMetadata } from "./method";

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

    export function define(target: Object, propertyKey: string, descriptor?: PropertyDescriptor): HttpMetadata {
        let method = MethodMetadata.define(target, propertyKey, descriptor) as HttpMetadata;
        method.bindings = method.bindings || [];
        method.http = method.http || {};
        return method;
    }
}