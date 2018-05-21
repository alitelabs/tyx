import { Export } from "../decorators";
import { MethodMetadata, ServiceMetadata } from "../metadata";
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

export function Query<TR extends Roles>(roles?: TR) {
    return AuthDecorator(Query.name, roles || {}, true);
}

export function Mutation<TR extends Roles>(roles?: TR) {
    return AuthDecorator(Mutation.name, roles || {}, true);
}

export function Command<TR extends Roles>(roles?: TR) {
    return AuthDecorator(Command.name, roles || {}, true);
}

function AuthDecorator(access: string, roles: Roles, graphql?: boolean): MethodDecorator {
    access = access.toLowerCase();

    return (target, propertyKey, descriptor) => {
        // TODO: Throw TypeError on symbol
        propertyKey = propertyKey.toString();
        graphql = !!graphql;

        let meta = MethodMetadata.define(target, propertyKey, descriptor);
        if (!graphql) meta.access = meta.access || access;
        meta.graphql = !!meta.graphql || graphql;
        roles = meta.roles = { ...meta.roles, ...roles };
        roles.Internal = roles.Internal === undefined ? true : !!roles.Internal;
        roles.External = roles.External === undefined ? false : !!roles.External;
        roles.Remote = roles.Remote === undefined ? true : !!roles.Internal;

        let service = ServiceMetadata.get(target);
        service.methodMetadata[propertyKey] = meta;
        if (roles.Internal || roles.Remote || roles.External)
            Export()(target, propertyKey, descriptor);
    };
}

