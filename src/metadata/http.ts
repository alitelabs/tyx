import { ArgBinder, HttpAdapter, HttpCode } from "../types";
import { MethodArgMetadata, MethodMetadata } from "./method";

export interface HttpMetadata extends MethodMetadata {
    args: HttpArgMetadata[];
    contentType?: string;
    http: Record<string, HttpRouteMetadata>;
}

export interface HttpArgMetadata extends MethodArgMetadata {
    bind: string;
    param: string;
    binder: ArgBinder;
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
        method.http = method.http || {};
        return method;
    }
}