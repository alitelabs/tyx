import { MethodMetadata } from "../metadata/method";
import { Registry } from "../metadata/registry";
import { InputType, ReturnType } from "../metadata/type";
import { Class } from "../types/core";
import { Roles } from "../types/security";

export function Query<TR extends Roles, TI = any, TO = any>(roles?: TR, input?: InputType<TI>, result?: ReturnType<TO>) {
    return ResolverDecorator(Query, roles, input, result);
}

export function Advice<TR extends Roles, TI = any, TO = any>(roles?: TR, input?: InputType<TI>, result?: ReturnType<TO>) {
    return ResolverDecorator(Advice, roles, input, result);
}

export function Mutation<TR extends Roles, TI = any, TO = any>(roles?: TR, input?: InputType<TI>, result?: ReturnType<TO>) {
    return ResolverDecorator(Mutation, roles, input, result);
}

export function Command<TR extends Roles, TI = any, TO = any>(roles?: TR, input?: InputType<TI>, result?: ReturnType<TO>) {
    return ResolverDecorator(Command, roles, input, result);
}

export function Extension<TI = any, TO = any>(type: Class, input?: InputType<TI>, result?: ReturnType<TO>) {
    return ResolverDecorator(Extension, { Internal: true }, input, result, type);
}

function ResolverDecorator(decorator: Function, roles: Roles, input: InputType, result: ReturnType, type?: Class): MethodDecorator {
    return (target, propertyKey, descriptor) => {
        Registry.trace(decorator, { roles, input, result }, target, propertyKey);
        let oper = decorator.name.toLowerCase();
        if (typeof propertyKey !== "string") throw new TypeError("propertyKey must be string");
        let meta = MethodMetadata.define(target, propertyKey, descriptor).addAuth(oper, roles);
        if (decorator === Mutation || decorator === Command) meta.setMutation(input, result);
        else if (decorator === Query || decorator === Advice) meta.setQuery(input, result);
        else if (decorator === Extension) meta.setResolver(type, input, result);
        else throw TypeError(`Unknown decorator: ${decorator.name}`);
    };
}

