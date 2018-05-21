import { Roles } from "../types";
import { MethodMetadata } from "./method";

export interface AuthMetadata extends MethodMetadata {
    auth: string;
    roles: Roles;
    graphql: boolean;
}

export namespace AuthMetadata {
    export function has(target: Object, propertyKey: string): boolean {
        return !!get(target, propertyKey);
    }
    export function get(target: Object, propertyKey: string): AuthMetadata {
        let meta = MethodMetadata.get(target, propertyKey) as AuthMetadata;
        return meta && meta.roles && meta as AuthMetadata;
    }
    export function define(target: Object, propertyKey: string, descriptor?: PropertyDescriptor): AuthMetadata {
        let meta = MethodMetadata.define(target, propertyKey, descriptor) as AuthMetadata;
        meta.roles = meta.roles || {};
        meta.auth = meta.auth || null;
        meta.graphql = meta.graphql || false;
        return meta;
    }
}