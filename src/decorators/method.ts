import { Export } from "../decorators";
import { MethodMetadata, ServiceMetadata } from "../metadata";
import { Roles } from "../types";
import * as Utils from "../utils/misc";

export function Public() {
    return Descriptor(Public.name, { Public: true });
}

export function Debug() {
    return Descriptor(Debug.name, { Debug: true });
}

export function Private() {
    return Descriptor(Private.name, { Internal: false, Remote: false });
}

export function Internal() {
    return Descriptor(Internal.name, { Internal: true, Remote: false });
}

export function Remote() {
    return Descriptor(Remote.name, { Internal: true, Remote: true });
}

export function Rest<R extends Roles>(roles: R) {
    return Descriptor(Rest.name, roles);
}

export function Query<R extends Roles>(roles: R) {
    return Descriptor(Query.name, roles);
}

export function Command<R extends Roles>(roles: R) {
    return Descriptor(Command.name, roles);
}

function Descriptor(access: string, roles: Roles) {
    access = access.toLowerCase();

    return function (type: Object, propertyKey: string, descriptor: PropertyDescriptor) {
        // roles.Root = roles.Root === undefined ? true : !!roles.Root;
        roles.Internal = roles.Internal === undefined ? true : !!roles.Internal;
        roles.Remote = roles.Remote === undefined ? true : !!roles.Internal;

        let names = Utils.getArgs(descriptor.value)
        let types = Reflect.getMetadata("design:paramtypes", type, propertyKey);
        let returns = Reflect.getMetadata("design:returntype", type, propertyKey);

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

        let metadata = ServiceMetadata.get(type);
        metadata.permissions[propertyKey] = method;

        if (roles.Internal || roles.Remote)
            Export()(type, propertyKey, descriptor);
    };
}

