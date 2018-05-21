import { Export } from "../decorators";
import { MethodMetadata, ServiceMetadata } from "../metadata";
import { Roles } from "../types";
import * as Utils from "../utils/misc";

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

export function Auth<R extends Roles>(roles: R) {
    return AuthDecorator(Auth.name, roles);
}

export function Query<R extends Roles>(roles: R) {
    return AuthDecorator(Query.name, roles);
}

export function Command<R extends Roles>(roles: R) {
    return AuthDecorator(Command.name, roles);
}

function AuthDecorator(access: string, roles: Roles, graphql?: boolean): MethodDecorator {
    access = access.toLowerCase();

    return (target, propertyKey, descriptor) => {
        // TODO: Throw TypeError on symbol
        propertyKey = propertyKey.toString();

        let metadata = ServiceMetadata.get(target);
        let prev = metadata.methodMetadata[propertyKey];
        if (prev) roles = { ...prev.roles, ...roles };
        roles.Internal = roles.Internal === undefined ? true : !!roles.Internal;
        roles.Remote = roles.Remote === undefined ? true : !!roles.Internal;
        if (!graphql && prev) access = prev.access;

        let names = Utils.getArgs(descriptor.value as any);
        let types = Reflect.getMetadata("design:paramtypes", target, propertyKey);
        let returns = Reflect.getMetadata("design:returntype", target, propertyKey);

        let args = {};
        names.forEach((a, i) => args[a] = "" + types[i]);

        let method: MethodMetadata = {
            service: undefined,
            method: propertyKey,
            access: access.toLowerCase(),
            roles,
            args,
            returns: "" + returns
        };
        if (!graphql && prev.access)
            metadata.methodMetadata[propertyKey] = method;

        if (roles.Internal || roles.Remote || roles.External)
            Export()(target, propertyKey, descriptor);
    };
}

