import "../env";

import {
    Roles
} from "../types";

import {
    ServiceMetadata,
    PermissionMetadata
} from "../metadata";

import {
    Export
} from "../decorators";


export function Public() {
    return Permission(Public.name, { Public: true });
}

export function Private() {
    return Permission(Private.name, { Internal: false, Remote: false });
}

export function Internal() {
    return Permission(Internal.name, { Internal: true, Remote: false });
}

export function Remote() {
    return Permission(Remote.name, { Internal: true, Remote: true });
}

export function Invoke<R extends Roles>(roles: R) {
    return Permission(Invoke.name, roles);
}

export function Query<R extends Roles>(roles: R) {
    return Permission(Query.name, roles);
}

export function Command<R extends Roles>(roles: R) {
    return Permission(Command.name, roles);
}

function Permission(name: string, roles: Roles) {
    name = name.toLowerCase();

    return function (type: Object, propertyKey: string, descriptor: PropertyDescriptor) {
        // roles.Root = roles.Root === undefined ? true : !!roles.Root;
        roles.Internal = roles.Internal === undefined ? true : !!roles.Internal;
        roles.Remote = roles.Remote === undefined ? true : !!roles.Internal;

        let permission: PermissionMetadata = {
            service: undefined,
            method: propertyKey,
            name: name.toLowerCase(),
            roles
        };

        let metadata = ServiceMetadata.get(type);
        metadata.permissions[propertyKey] = permission;

        if (roles.Internal || roles.Remote)
            Export()(type, propertyKey, descriptor);
    };
}