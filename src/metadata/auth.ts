import { Roles } from "../types";
import { MethodMetadata } from "./method";

export interface AuthMetadata extends MethodMetadata {
    auth: string;
    roles: Roles;
}

export namespace AuthMetadata {
    export function has(target: Object, propertyKey: string): boolean {
        return !!get(target, propertyKey);
    }

    export function get(target: Object, propertyKey: string): AuthMetadata {
        let meta = MethodMetadata.get(target, propertyKey) as AuthMetadata;
        return meta && meta.roles && meta;
    }

    export function define(target: Object, propertyKey: string, descriptor: PropertyDescriptor, auth: string, roles: Roles): AuthMetadata {
        let meta = MethodMetadata.define(target, propertyKey, descriptor) as AuthMetadata;
        meta.auth = auth;
        roles = meta.roles = { ...meta.roles, ...roles };
        roles.Internal = roles.Internal === undefined ? true : !!roles.Internal;
        roles.External = roles.External === undefined ? false : !!roles.External;
        roles.Remote = roles.Remote === undefined ? true : !!roles.Internal;
        return meta;
    }
}