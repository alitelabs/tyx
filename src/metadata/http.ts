import { ArgBinder, HttpAdapter, HttpCode } from "../types";
import { MethodMetadata } from "./method";

export interface HttpMetadata {
    api?: string;
    service?: string;
    route: string;
    method: string;
    verb: string;
    resource: string;
    model: string;
    code: HttpCode;
    adapter: HttpAdapter;
}

export interface BindingMetadata {
    api?: string;
    service?: string;
    method: string;
    contentType?: string;
    argBindings: ArgBindingMetadata[];
}

export interface ArgBindingMetadata {
    index: number;
    type: string;
    param: string;
    binder: ArgBinder;
}

export interface HttpMetadataInfo {
    contentType?: string;
    routes: Record<string, RouteMetadataInfo>;
    bindings: BindingMetadataInfo[];
}

export interface RouteMetadataInfo {
    // route: string;
    verb: string;
    resource: string;
    model: string;
    code: HttpCode;
    adapter: HttpAdapter;
}

export interface BindingMetadataInfo {
    index?: number;
    type: string;
    param: string;
    binder: ArgBinder;
}

export namespace HttpMetadata {
    export function has(target: Object, propertyKey: string): boolean {
        return !!get(target, propertyKey);
    }

    export function get(target: Object, propertyKey: string): HttpMetadataInfo {
        let meta = MethodMetadata.get(target, propertyKey);
        return meta && meta.http;
    }

    export function define(target: Object, propertyKey: string, descriptor?: PropertyDescriptor): HttpMetadataInfo {
        let method = MethodMetadata.define(target, propertyKey, descriptor);
        method.http = method.http || {
            contentType: undefined,
            routes: {},
            bindings: []
        };
        return method.http;
    }
}