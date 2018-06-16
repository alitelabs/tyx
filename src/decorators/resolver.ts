import { MethodMetadata } from '../metadata/method';
import { Registry } from '../metadata/registry';
import { InputType, ResultType } from '../metadata/type';
import { Class } from '../types/core';
import { Roles } from '../types/security';

// tslint:disable:function-name

export function Query<TR extends Roles, TI = any, TO = any>(roles?: TR, input?: InputType<TI>, result?: ResultType<TO>) {
  return ResolverDecorator(Query, roles, input, result);
}

export function Advice<TR extends Roles, TI = any, TO = any>(roles?: TR, input?: InputType<TI>, result?: ResultType<TO>) {
  return ResolverDecorator(Advice, roles, input, result);
}

export function Mutation<TR extends Roles, TI = any, TO = any>(roles?: TR, input?: InputType<TI>, result?: ResultType<TO>) {
  return ResolverDecorator(Mutation, roles, input, result);
}

export function Command<TR extends Roles, TI = any, TO = any>(roles?: TR, input?: InputType<TI>, result?: ResultType<TO>) {
  return ResolverDecorator(Command, roles, input, result);
}

export function Extension<TI = any, TO = any>(type: Class, input?: InputType<TI>, result?: ResultType<TO>) {
  return ResolverDecorator(Extension, { Internal: true }, input, result, type);
}

function ResolverDecorator(decorator: Function, roles: Roles, input: InputType, result: ResultType, type?: Class): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    Registry.trace(decorator, { roles, input, result }, target, propertyKey);
    const oper = decorator.name.toLowerCase();
    if (typeof propertyKey !== 'string') throw new TypeError('propertyKey must be string');
    const meta = MethodMetadata.define(target, propertyKey, descriptor).addAuth(oper, roles);
    if (decorator === Mutation || decorator === Command) meta.setMutation(input, result);
    else if (decorator === Query || decorator === Advice) meta.setQuery(input, result);
    else if (decorator === Extension) meta.setResolver(type, input, result);
    else throw TypeError(`Unknown decorator: ${decorator.name}`);
  };
}
