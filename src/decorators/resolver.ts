import { ResolverMetadata, ServiceMetadata } from "../metadata";
import { Roles } from "../types";

export function Query<TR extends Roles>(roles?: TR, input?: Function, result?: Function) {
    return ResolverDecorator(Query.name, roles, input, result);
}

export function Mutation<TR extends Roles>(roles?: TR, input?: Function, result?: Function) {
    return ResolverDecorator(Mutation.name, roles, input, result);
}

export function Advice<TR extends Roles>(roles?: TR, input?: Function, result?: Function) {
    return ResolverDecorator(Advice.name, roles, input, result);
}

export function Command<TR extends Roles>(roles?: TR, input?: Function, result?: Function) {
    return ResolverDecorator(Command.name, roles, input, result);
}

function ResolverDecorator(oper: string, roles: Roles, input?: Function, result?: Function): MethodDecorator {
    oper = oper.toLowerCase();
    return (target, propertyKey, descriptor) => {
        if (typeof propertyKey !== "string") throw new TypeError("propertyKey must be string");
        let meta = ResolverMetadata.define(target, propertyKey, descriptor, oper, roles);
        let service = ServiceMetadata.define(target.constructor);
        service.authMetadata[propertyKey] = meta;
        service.resolverMetadata[propertyKey] = meta;
    };
}