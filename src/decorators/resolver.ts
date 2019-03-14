import { MethodMetadata } from '../metadata/method';
import { Metadata } from '../metadata/registry';
import { EnumMetadata, InputType, ResultType, Scalar, ScalarRef, Select } from '../metadata/type';
import { ClassRef, TypeRef } from '../types/core';

// tslint:disable:function-name

export function Query<TI, TR>(input: InputType<TI>, result: EnumMetadata): MethodDecorator;
export function Query<TI, TR>(input: InputType<TI>, result: Scalar | [Scalar] | ScalarRef<TR>): MethodDecorator;
export function Query<TI, TR>(input: InputType<TI>, result: TypeRef<TR>, select?: Select<TR>): MethodDecorator;
export function Query<TI, TR>(input: InputType<TI>, result: ResultType<TR>, select?: Select<TR>): MethodDecorator {
  return ResolverDecorator(Query, input, result, select);
}

export function Advice<TI, TR>(input: InputType<TI>, result: EnumMetadata): MethodDecorator;
export function Advice<TI, TR>(input: InputType<TI>, result: Scalar | [Scalar] | ScalarRef<TR>): MethodDecorator;
export function Advice<TI, TR>(input: InputType<TI>, result: TypeRef<TR>, select?: Select<TR>): MethodDecorator;
export function Advice<TI, TR>(input: InputType<TI>, result: ResultType<TR>, select?: Select<TR>): MethodDecorator {
  return ResolverDecorator(Advice, input, result, select);
}

export function Mutation<TI, TR>(input: InputType<TI>, result: EnumMetadata): MethodDecorator;
export function Mutation<TI, TR>(input: InputType<TI>, result: Scalar | [Scalar] | ScalarRef<TR>): MethodDecorator;
export function Mutation<TI, TR>(input: InputType<TI>, result: TypeRef<TR>, select?: Select<TR>): MethodDecorator;
export function Mutation<TI, TR>(input: InputType<TI>, result: ResultType<TR>, select?: Select<TR>): MethodDecorator {
  return ResolverDecorator(Mutation, input, result, select);
}

export function Command<TI, TR>(input: InputType<TI>, result: EnumMetadata): MethodDecorator;
export function Command<TI, TR>(input: InputType<TI>, result: Scalar | [Scalar] | ScalarRef<TR>): MethodDecorator;
export function Command<TI, TR>(input: InputType<TI>, result: TypeRef<TR>, select?: Select<TR>): MethodDecorator;
export function Command<TI, TR>(input: InputType<TI>, result: ResultType<TR>, select?: Select<TR>): MethodDecorator {
  return ResolverDecorator(Command, input, result, select);
}

export function Extension<TI, TR>(type: ClassRef, input: InputType<TI>, result: EnumMetadata): MethodDecorator;
export function Extension<TI, TR>(type: ClassRef, input: InputType<TI>, result: Scalar | [Scalar] | ScalarRef<TR>): MethodDecorator;
export function Extension<TI, TR>(type: ClassRef, input: InputType<TI>, result: TypeRef<TR>, select?: Select<TR>): MethodDecorator;
export function Extension<TI, TR>(type: ClassRef, input: InputType<TI>, result: ResultType<TR>, select?: Select<TR>): MethodDecorator {
  return ResolverDecorator(Extension, input, result, select, type);
}

function ResolverDecorator(decorator: Function, input: InputType, result: ResultType, select: Select, host?: ClassRef): MethodDecorator {
  return Metadata.onMethod(decorator, { input, result, select, host }, (target, propertyKey, descriptor) => {
    const oper = decorator.name.toLowerCase();
    const meta = MethodMetadata.define(target, propertyKey as string, descriptor).addAuth(oper, { Internal: true });
    if (decorator === Mutation || decorator === Command) meta.setMutation(input, result, select);
    else if (decorator === Query || decorator === Advice) meta.setQuery(input, result, select);
    else if (decorator === Extension) meta.setResolver(host, input, result, select);
    else throw TypeError(`Unknown decorator: ${decorator.name}`);
  });
}
