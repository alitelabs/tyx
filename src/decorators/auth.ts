import { Metadata } from "../metadata/common";
import { MethodMetadata } from "../metadata/method";
import { Roles } from "../types";

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
        Metadata.trace(decorator, { roles }, target, propertyKey);
        let auth = decorator.name.toLowerCase();
        MethodMetadata.define(target, propertyKey, descriptor).addAuth(auth, roles);
    };
}

