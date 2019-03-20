import { EnumMetadata } from '../metadata/enum';
import { MethodMetadata, MethodType } from '../metadata/method';
import { Metadata } from '../metadata/registry';
import { Args, Info, InputType, LiteralRef, LiteralType, Obj, ResultType, Select } from '../metadata/var';
import { ClassRef, Context, TypeRef } from '../types/core';

// tslint:disable:function-name
// tslint:disable:max-line-length

export function Query<TR>(result: EnumMetadata): MethodDecorator;
export function Query<TR>(result: LiteralType | [LiteralType] | LiteralRef<TR>): MethodDecorator;
export function Query<TR>(result: TypeRef<TR>): MethodDecorator;
export function Query<TR>(inputs: InputType, result: EnumMetadata): MethodDecorator;
export function Query<TR>(inputs: InputType, result: LiteralType | [LiteralType] | LiteralRef<TR>): MethodDecorator;
export function Query<TR>(inputs: InputType, result: TypeRef<TR>, select?: Select<TR>): MethodDecorator;
export function Query<TR>(inputs: InputType[], result: EnumMetadata): MethodDecorator;
export function Query<TR>(inputs: InputType[], result: LiteralType | [LiteralType] | LiteralRef<TR>): MethodDecorator;
export function Query<TR>(inputs: InputType[], result: TypeRef<TR>, select?: Select<TR>): MethodDecorator;
export function Query<TR>(inputsOrResult: InputType | InputType[] | ResultType<TR>, resultOrSelect?: ResultType<TR> | Select<TR>, maybeSelect?: Select<TR>): MethodDecorator {
  return ResolverDecorator(Query, MethodType.Query, undefined, inputsOrResult, resultOrSelect, maybeSelect);
}

export function Advice<TR>(result: EnumMetadata): MethodDecorator;
export function Advice<TR>(result: LiteralType | [LiteralType] | LiteralRef<TR>): MethodDecorator;
export function Advice<TR>(result: TypeRef<TR>): MethodDecorator;
export function Advice<TR>(inputs: InputType, result: EnumMetadata): MethodDecorator;
export function Advice<TR>(inputs: InputType, result: LiteralType | [LiteralType] | LiteralRef<TR>): MethodDecorator;
export function Advice<TR>(inputs: InputType, result: TypeRef<TR>, select?: Select<TR>): MethodDecorator;
export function Advice<TR>(inputs: InputType[], result: EnumMetadata): MethodDecorator;
export function Advice<TR>(inputs: InputType[], result: LiteralType | [LiteralType] | LiteralRef<TR>): MethodDecorator;
export function Advice<TR>(inputs: InputType[], result: TypeRef<TR>, select?: Select<TR>): MethodDecorator;

export function Advice<TR>(inputsOrResult: InputType | InputType[] | ResultType<TR>, resultOrSelect?: ResultType<TR> | Select<TR>, maybeSelect?: Select<TR>): MethodDecorator {
  return ResolverDecorator(Advice, MethodType.Query, undefined, inputsOrResult, resultOrSelect, maybeSelect);
}

export function Mutation<TR>(result: EnumMetadata): MethodDecorator;
export function Mutation<TR>(result: LiteralType | [LiteralType] | LiteralRef<TR>): MethodDecorator;
export function Mutation<TR>(result: TypeRef<TR>): MethodDecorator;
export function Mutation<TR>(inputs: InputType, result: EnumMetadata): MethodDecorator;
export function Mutation<TR>(inputs: InputType, result: LiteralType | [LiteralType] | LiteralRef<TR>): MethodDecorator;
export function Mutation<TR>(inputs: InputType, result: TypeRef<TR>, select?: Select<TR>): MethodDecorator;
export function Mutation<TR>(inputs: InputType[], result: EnumMetadata): MethodDecorator;
export function Mutation<TR>(inputs: InputType[], result: LiteralType | [LiteralType] | LiteralRef<TR>): MethodDecorator;
export function Mutation<TR>(inputs: InputType[], result: TypeRef<TR>, select?: Select<TR>): MethodDecorator;
export function Mutation<TR>(inputsOrResult: InputType | InputType[] | ResultType<TR>, resultOrSelect?: ResultType<TR> | Select<TR>, maybeSelect?: Select<TR>): MethodDecorator {
  return ResolverDecorator(Mutation, MethodType.Mutation, undefined, inputsOrResult, resultOrSelect, maybeSelect);
}

export function Command<TR>(result: EnumMetadata): MethodDecorator;
export function Command<TR>(result: LiteralType | [LiteralType] | LiteralRef<TR>): MethodDecorator;
export function Command<TR>(result: TypeRef<TR>): MethodDecorator;
export function Command<TR>(inputs: InputType, result: EnumMetadata): MethodDecorator;
export function Command<TR>(inputs: InputType, result: LiteralType | [LiteralType] | LiteralRef<TR>): MethodDecorator;
export function Command<TR>(inputs: InputType, result: TypeRef<TR>, select?: Select<TR>): MethodDecorator;
export function Command<TR>(inputs: InputType[], result: EnumMetadata): MethodDecorator;
export function Command<TR>(inputs: InputType[], result: LiteralType | [LiteralType] | LiteralRef<TR>): MethodDecorator;
export function Command<TR>(inputs: InputType[], result: TypeRef<TR>, select?: Select<TR>): MethodDecorator;
export function Command<TR>(inputsOrResult: InputType | InputType[] | ResultType<TR>, resultOrSelect?: ResultType<TR> | Select<TR>, maybeSelect?: Select<TR>): MethodDecorator {
  return ResolverDecorator(Command, MethodType.Mutation, undefined, inputsOrResult, resultOrSelect, maybeSelect);
}

export function Extension<TR>(host: ClassRef, result: EnumMetadata): MethodDecorator;
export function Extension<TR>(host: ClassRef, result: LiteralType | [LiteralType] | LiteralRef<TR>): MethodDecorator;
export function Extension<TR>(host: ClassRef, result: TypeRef<TR>): MethodDecorator;
export function Extension<TR>(host: ClassRef, inputs: InputType, result: EnumMetadata): MethodDecorator;
export function Extension<TR>(host: ClassRef, inputs: InputType, result: LiteralType | [LiteralType] | LiteralRef<TR>): MethodDecorator;
export function Extension<TR>(host: ClassRef, inputs: InputType, result: TypeRef<TR>, select?: Select<TR>): MethodDecorator;
export function Extension<TR>(host: ClassRef, inputs: InputType[], result: EnumMetadata): MethodDecorator;
export function Extension<TR>(host: ClassRef, inputs: InputType[], result: LiteralType | [LiteralType] | LiteralRef<TR>): MethodDecorator;
export function Extension<TR>(host: ClassRef, inputs: InputType[], result: TypeRef<TR>, select?: Select<TR>): MethodDecorator;
export function Extension<TR>(host: ClassRef, inputsOrResult: InputType | InputType[] | ResultType<TR>, resultOrSelect?: ResultType<TR> | Select<TR>, maybeSelect?: Select<TR>): MethodDecorator {
  return ResolverDecorator(Extension, MethodType.Extension, host, inputsOrResult, resultOrSelect, maybeSelect);
}

function ResolverDecorator(
  decorator: Function,
  type: MethodType,
  host: ClassRef,
  inputsOrResult: InputType | InputType[] | ResultType,
  resultOrSelect: ResultType | Select,
  mayBeSelect?: Select
): MethodDecorator {
  let inputs: InputType[];
  let result: ResultType;
  let select: Select;
  if (!resultOrSelect && !mayBeSelect) {
    inputs = undefined;
    result = inputsOrResult as any;
  } else if (inputsOrResult && resultOrSelect && typeof resultOrSelect === 'object' && !Array.isArray(resultOrSelect)) {
    inputs = undefined;
    result = inputsOrResult as any;
    select = resultOrSelect as any;
  } else if (inputsOrResult && resultOrSelect && !mayBeSelect) {
    inputs = (Array.isArray(inputsOrResult) ? inputsOrResult : [inputsOrResult]) as any;
    result = resultOrSelect as any;
    select = mayBeSelect;
  } else {
    throw new TypeError('Assert');
  }

  return Metadata.onMethod(decorator, { host, inputs, result, select }, (target, propertyKey, descriptor) => {
    const oper = decorator.name.toLowerCase();
    const meta = MethodMetadata.define(target, propertyKey as string, descriptor).addAuth(oper, { Internal: true });
    meta.confirm(type, host, inputs, result, select);
  });
}

export function GraphObject(): ParameterDecorator {
  return Metadata.onParameter(GraphObject, {}, (target, propertyKey, parameterIndex) => {
    MethodMetadata.define(target, propertyKey as string).setInput(parameterIndex, Obj);
  });
}

export function ArgsObject(): ParameterDecorator {
  return Metadata.onParameter(ArgsObject, {}, (target, propertyKey, parameterIndex) => {
    MethodMetadata.define(target, propertyKey as string).setInput(parameterIndex, Args);
  });
}

export function ReqTODO(): ParameterDecorator {
  return Metadata.onParameter(ReqTODO, {}, (target, propertyKey, parameterIndex) => {
    // TODO
  });
}

export function ArgParam(): ParameterDecorator;
export function ArgParam(required: boolean): ParameterDecorator;
export function ArgParam(name: string): ParameterDecorator;
export function ArgParam(name: string, required: boolean): ParameterDecorator;
export function ArgParam(requiredOrName?: boolean | string, maybeName?: boolean): ParameterDecorator {
  return Metadata.onParameter(ArgParam, { requiredOrName, maybeName }, (target, propertyKey, parameterIndex) => {
    // TODO
    //  MethodMetadata.define(target, propertyKey as string).setInput(parameterIndex, Obj);
  });
}

export function CtxObject(): ParameterDecorator {
  return Metadata.onParameter(CtxObject, {}, (target, propertyKey, parameterIndex) => {
    MethodMetadata.define(target, propertyKey as string).setInput(parameterIndex, Context);
  });
}

export function InfoObject(): ParameterDecorator {
  return Metadata.onParameter(InfoObject, {}, (target, propertyKey, parameterIndex) => {
    MethodMetadata.define(target, propertyKey as string).setInput(parameterIndex, Info);
  });
}
