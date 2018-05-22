import { AuthMetadata, ServiceMetadata } from "../metadata";
import { Roles } from "../types";

export function Public() {
    return AuthDecorator(Public.name, { Public: true, Internal: true, External: true, Remote: true });
}

export function Debug() {
    return AuthDecorator(Debug.name, { Debug: true, Internal: true, External: false, Remote: true });
}

export function Private() {
    return AuthDecorator(Private.name, { Internal: false, Remote: false, External: false });
}

export function Internal() {
    return AuthDecorator(Internal.name, { Internal: true, External: false, Remote: false });
}

export function External() {
    return AuthDecorator(External.name, { Internal: true, External: true, Remote: true });
}

export function Remote() {
    return AuthDecorator(Remote.name, { Internal: true, External: false, Remote: true });
}

export function Authorization<TR extends Roles>(roles: TR) {
    return AuthDecorator(Authorization.name, roles);
}

function AuthDecorator(auth: string, roles: Roles): MethodDecorator {
    auth = auth.toLowerCase();
    return (target, propertyKey, descriptor) => {
        if (typeof propertyKey !== "string") throw new TypeError("propertyKey must be string");
        let meta = AuthMetadata.define(target, propertyKey, descriptor, auth, roles);
        let service = ServiceMetadata.define(target.constructor);
        service.authMetadata[propertyKey] = meta;
    };
}

