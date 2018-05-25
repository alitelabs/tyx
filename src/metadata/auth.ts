import { Roles } from "../types";
import { ApiMetadata } from "./api";
import { MethodMetadata } from "./method";
import { Metadata } from "./common";

export function Public() {
    return AuthDecorator(Public, { Public: true, Internal: true, External: true, Remote: true });
}

export function Debug() {
    return AuthDecorator(Debug, { Debug: true, Internal: true, External: false, Remote: true });
}

export function Private() {
    return AuthDecorator(Private, { Internal: false, Remote: false, External: false });
}

export function Internal() {
    return AuthDecorator(Internal, { Internal: true, External: false, Remote: false });
}

export function External() {
    return AuthDecorator(External, { Internal: true, External: true, Remote: true });
}

export function Remote() {
    return AuthDecorator(Remote, { Internal: true, External: false, Remote: true });
}

export function Authorization<TR extends Roles>(roles: TR) {
    return AuthDecorator(Authorization, roles);
}

function AuthDecorator(decorator: Function, roles: Roles): MethodDecorator {
    return (target, propertyKey, descriptor) => {
        if (typeof propertyKey !== "string") throw new TypeError("propertyKey must be string");
        Metadata.trace(decorator, target, propertyKey);
        let auth = decorator.name.toLowerCase();
        AuthMetadata.define(target, propertyKey, descriptor, auth, roles);
    };
}

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
        let api = ApiMetadata.init(target.constructor);
        api.authMetadata[propertyKey] = meta;
        return meta;
    }
}