import { MethodMetadata } from '../metadata/method';
import { Metadata } from '../metadata/registry';
import { ClassRef, EnumMetadata, InputType, ResultType, Scalar, ScalarRef, Select } from '../metadata/type';
import { Class } from '../types/core';

// tslint:disable:function-name

export function Query<TI, TR>(input: InputType<TI>, result: EnumMetadata): MethodDecorator;
export function Query<TI, TR>(input: InputType<TI>, result: Scalar | [Scalar] | ScalarRef<TR>): MethodDecorator;
export function Query<TI, TR>(input: InputType<TI>, result: ClassRef<TR>, select?: Select<TR>): MethodDecorator;
export function Query<TI, TR>(input: InputType<TI>, result: ResultType<TR>, select?: Select<TR>): MethodDecorator {
  return ResolverDecorator(Query, input, result, select);
}

export function Advice<TI, TR>(input: InputType<TI>, result: EnumMetadata): MethodDecorator;
export function Advice<TI, TR>(input: InputType<TI>, result: Scalar | [Scalar] | ScalarRef<TR>): MethodDecorator;
export function Advice<TI, TR>(input: InputType<TI>, result: ClassRef<TR>, select?: Select<TR>): MethodDecorator;
export function Advice<TI, TR>(input: InputType<TI>, result: ResultType<TR>, select?: Select<TR>): MethodDecorator {
  return ResolverDecorator(Advice, input, result, select);
}

export function Mutation<TI, TR>(input: InputType<TI>, result: EnumMetadata): MethodDecorator;
export function Mutation<TI, TR>(input: InputType<TI>, result: Scalar | [Scalar] | ScalarRef<TR>): MethodDecorator;
export function Mutation<TI, TR>(input: InputType<TI>, result: ClassRef<TR>, select?: Select<TR>): MethodDecorator;
export function Mutation<TI, TR>(input: InputType<TI>, result: ResultType<TR>, select?: Select<TR>): MethodDecorator {
  return ResolverDecorator(Mutation, input, result, select);
}

export function Command<TI, TR>(input: InputType<TI>, result: EnumMetadata): MethodDecorator;
export function Command<TI, TR>(input: InputType<TI>, result: Scalar | [Scalar] | ScalarRef<TR>): MethodDecorator;
export function Command<TI, TR>(input: InputType<TI>, result: ClassRef<TR>, select?: Select<TR>): MethodDecorator;
export function Command<TI, TR>(input: InputType<TI>, result: ResultType<TR>, select?: Select<TR>): MethodDecorator {
  return ResolverDecorator(Command, input, result, select);
}

export function Extension<TI, TR>(type: Class, input: InputType<TI>, result: EnumMetadata): MethodDecorator;
export function Extension<TI, TR>(type: Class, input: InputType<TI>, result: Scalar | [Scalar] | ScalarRef<TR>): MethodDecorator;
export function Extension<TI, TR>(type: Class, input: InputType<TI>, result: ClassRef<TR>, select?: Select<TR>): MethodDecorator;
export function Extension<TI, TR>(type: Class, input: InputType<TI>, result: ResultType<TR>, select?: Select<TR>): MethodDecorator {
  return ResolverDecorator(Extension, input, result, select, type);
}

function ResolverDecorator(decorator: Function, input: InputType, result: ResultType, select: Select, type?: Class): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    Metadata.trace(decorator, { input, result, select, type }, target, propertyKey);
    const oper = decorator.name.toLowerCase();
    if (typeof propertyKey !== 'string') throw new TypeError('propertyKey must be string');
    const meta = MethodMetadata.define(target, propertyKey, descriptor).addAuth(oper, { Internal: true });
    if (decorator === Mutation || decorator === Command) meta.setMutation(input, result, select);
    else if (decorator === Query || decorator === Advice) meta.setQuery(input, result, select);
    else if (decorator === Extension) meta.setResolver(type, input, result, select);
    else throw TypeError(`Unknown decorator: ${decorator.name}`);
  };
}
