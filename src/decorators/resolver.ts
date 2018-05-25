import { Metadata } from "../metadata/common";
import { MethodMetadata } from "../metadata/method";
import { Roles } from "../types";

export function Query<TR extends Roles>(roles?: TR, input?: Function, result?: Function) {
    return ResolverDecorator(Query, false, roles, input, result);
}

export function Mutation<TR extends Roles>(roles?: TR, input?: Function, result?: Function) {
    return ResolverDecorator(Mutation, true, roles, input, result);
}

export function Advice<TR extends Roles>(roles?: TR, input?: Function, result?: Function) {
    return ResolverDecorator(Advice, false, roles, input, result);
}

export function Command<TR extends Roles>(roles?: TR, input?: Function, result?: Function) {
    return ResolverDecorator(Command, true, roles, input, result);
}

function ResolverDecorator(decorator: Function, mutation: boolean, roles: Roles, input?: Function, result?: Function): MethodDecorator {
    return (target, propertyKey, descriptor) => {
        Metadata.trace(decorator, { roles, input, result }, target, propertyKey);
        let oper = decorator.name.toLowerCase();
        if (typeof propertyKey !== "string") throw new TypeError("propertyKey must be string");
        let meta = MethodMetadata.define(target, propertyKey, descriptor).addAuth(oper, roles);
        if (mutation) meta.setMutation(input, result); else meta.setQuery(input, result);
    };
}

