import { MethodMetadata } from "../metadata/method";
import { Registry } from "../metadata/registry";
import { GraphType } from "../metadata/type";
import { TypeRef } from "../types/core";
import { Roles } from "../types/security";

export function Query<TR extends Roles, TI = any, TO = any>(roles?: TR, input?: GraphType | TypeRef<TI>, result?: GraphType | TypeRef<TO>, listInput?: boolean, listResult?: boolean) {
    return ResolverDecorator(Query, false, roles, input, result, listInput, listResult);
}

export function Mutation<TR extends Roles, TI = any, TO = any>(roles?: TR, input?: GraphType | TypeRef<TI>, result?: GraphType | TypeRef<TO>, listInput?: boolean, listResult?: boolean) {
    return ResolverDecorator(Mutation, true, roles, input, result, listInput, listResult);
}

export function Advice<TR extends Roles, TI = any, TO = any>(roles?: TR, input?: GraphType | TypeRef<TI>, result?: GraphType | TypeRef<TO>, listInput?: boolean, listResult?: boolean) {
    return ResolverDecorator(Advice, false, roles, input, result, listInput, listResult);
}

export function Command<TR extends Roles, TI = any, TO = any>(roles?: TR, input?: GraphType | TypeRef<TI>, result?: GraphType | TypeRef<TO>, listInput?: boolean, listResult?: boolean) {
    return ResolverDecorator(Command, true, roles, input, result, listInput, listResult);
}

function ResolverDecorator(decorator: Function, mutation: boolean, roles: Roles, input?: GraphType | TypeRef<any>, result?: GraphType | TypeRef<any>, listInput?: boolean, listResult?: boolean): MethodDecorator {
    return (target, propertyKey, descriptor) => {
        Registry.trace(decorator, { roles, input, result }, target, propertyKey);
        let oper = decorator.name.toLowerCase();
        if (typeof propertyKey !== "string") throw new TypeError("propertyKey must be string");
        let meta = MethodMetadata.define(target, propertyKey, descriptor).addAuth(oper, roles);
        if (mutation) meta.setMutation(input, result); else meta.setQuery(input, result);
    };
}

