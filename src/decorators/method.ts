import { EnumMetadata } from '../metadata/enum';
import { MethodMetadata, MethodType } from '../metadata/method';
import { CoreDecorator } from '../metadata/registry';
import { TypeSelect } from '../metadata/type';
import { Any, Args, Info, InputType, LiteralRef, LiteralType, Obj, ResultType } from '../metadata/var';
import { ClassRef, Context, TypeRef } from '../types/core';

// tslint:disable:function-name
// tslint:disable:max-line-length

export function Query<TR>(result: EnumMetadata): MethodDecorator;
export function Query<TR>(result: LiteralType | [LiteralType] | LiteralRef): MethodDecorator;
export function Query<TR>(result: TypeRef<TR>): MethodDecorator;
export function Query<TR>(inputs: InputType, result: EnumMetadata): MethodDecorator;
export function Query<TR>(inputs: InputType, result: LiteralType | [LiteralType] | LiteralRef): MethodDecorator;
export function Query<TR>(inputs: InputType, result: TypeRef<TR>, select?: TypeSelect<TR>): MethodDecorator;
export function Query<TR>(inputs: InputType[], result: EnumMetadata): MethodDecorator;
export function Query<TR>(inputs: InputType[], result: LiteralType | [LiteralType] | LiteralRef): MethodDecorator;
export function Query<TR>(inputs: InputType[], result: TypeRef<TR>, select?: TypeSelect<TR>): MethodDecorator;
export function Query<TR>(inputsOrResult: InputType | InputType[] | ResultType<TR>, resultOrSelect?: ResultType<TR> | TypeSelect<TR>, maybeSelect?: TypeSelect<TR>): MethodDecorator {
  return ResolverDecorator(Query, MethodType.Query, undefined, inputsOrResult, resultOrSelect, maybeSelect);
}

export function Advice<TR>(result: EnumMetadata): MethodDecorator;
export function Advice<TR>(result: LiteralType | [LiteralType] | LiteralRef): MethodDecorator;
export function Advice<TR>(result: TypeRef<TR>): MethodDecorator;
export function Advice<TR>(inputs: InputType, result: EnumMetadata): MethodDecorator;
export function Advice<TR>(inputs: InputType, result: LiteralType | [LiteralType] | LiteralRef): MethodDecorator;
export function Advice<TR>(inputs: InputType, result: TypeRef<TR>, select?: TypeSelect<TR>): MethodDecorator;
export function Advice<TR>(inputs: InputType[], result: EnumMetadata): MethodDecorator;
export function Advice<TR>(inputs: InputType[], result: LiteralType | [LiteralType] | LiteralRef): MethodDecorator;
export function Advice<TR>(inputs: InputType[], result: TypeRef<TR>, select?: TypeSelect<TR>): MethodDecorator;

export function Advice<TR>(inputsOrResult: InputType | InputType[] | ResultType<TR>, resultOrSelect?: ResultType<TR> | TypeSelect<TR>, maybeSelect?: TypeSelect<TR>): MethodDecorator {
  return ResolverDecorator(Advice, MethodType.Query, undefined, inputsOrResult, resultOrSelect, maybeSelect);
}

export function Mutation<TR>(result: EnumMetadata): MethodDecorator;
export function Mutation<TR>(result: LiteralType | [LiteralType] | LiteralRef): MethodDecorator;
export function Mutation<TR>(result: TypeRef<TR>): MethodDecorator;
export function Mutation<TR>(inputs: InputType, result: EnumMetadata): MethodDecorator;
export function Mutation<TR>(inputs: InputType, result: LiteralType | [LiteralType] | LiteralRef): MethodDecorator;
export function Mutation<TR>(inputs: InputType, result: TypeRef<TR>, select?: TypeSelect<TR>): MethodDecorator;
export function Mutation<TR>(inputs: InputType[], result: EnumMetadata): MethodDecorator;
export function Mutation<TR>(inputs: InputType[], result: LiteralType | [LiteralType] | LiteralRef): MethodDecorator;
export function Mutation<TR>(inputs: InputType[], result: TypeRef<TR>, select?: TypeSelect): MethodDecorator;
export function Mutation<TR>(inputsOrResult: InputType | InputType[] | ResultType<TR>, resultOrSelect?: ResultType<TR> | TypeSelect<TR>, maybeSelect?: TypeSelect<TR>): MethodDecorator {
  return ResolverDecorator(Mutation, MethodType.Mutation, undefined, inputsOrResult, resultOrSelect, maybeSelect);
}

export function Command<TR>(result: EnumMetadata): MethodDecorator;
export function Command<TR>(result: LiteralType | [LiteralType] | LiteralRef): MethodDecorator;
export function Command<TR>(result: TypeRef<TR>): MethodDecorator;
export function Command<TR>(inputs: InputType, result: EnumMetadata): MethodDecorator;
export function Command<TR>(inputs: InputType, result: LiteralType | [LiteralType] | LiteralRef): MethodDecorator;
export function Command<TR>(inputs: InputType, result: TypeRef<TR>, select?: TypeSelect<TR>): MethodDecorator;
export function Command<TR>(inputs: InputType[], result: EnumMetadata): MethodDecorator;
export function Command<TR>(inputs: InputType[], result: LiteralType | [LiteralType] | LiteralRef): MethodDecorator;
export function Command<TR>(inputs: InputType[], result: TypeRef<TR>, select?: TypeSelect<TR>): MethodDecorator;
export function Command<TR>(inputsOrResult: InputType | InputType[] | ResultType<TR>, resultOrSelect?: ResultType<TR> | TypeSelect<TR>, maybeSelect?: TypeSelect<TR>): MethodDecorator {
  return ResolverDecorator(Command, MethodType.Mutation, undefined, inputsOrResult, resultOrSelect, maybeSelect);
}

export function Extension<TR>(scope: ClassRef, result: EnumMetadata): MethodDecorator;
export function Extension<TR>(scope: ClassRef, result: LiteralType | [LiteralType] | LiteralRef): MethodDecorator;
export function Extension<TR>(scope: ClassRef, result: TypeRef<TR>): MethodDecorator;
export function Extension<TR>(scope: ClassRef, inputs: InputType, result: EnumMetadata): MethodDecorator;
export function Extension<TR>(scope: ClassRef, inputs: InputType, result: LiteralType | [LiteralType] | LiteralRef): MethodDecorator;
export function Extension<TR>(scope: ClassRef, inputs: InputType, result: TypeRef<TR>, select?: TypeSelect<TR>): MethodDecorator;
export function Extension<TR>(scope: ClassRef, inputs: InputType[], result: EnumMetadata): MethodDecorator;
export function Extension<TR>(scope: ClassRef, inputs: InputType[], result: LiteralType | [LiteralType] | LiteralRef): MethodDecorator;
export function Extension<TR>(scope: ClassRef, inputs: InputType[], result: TypeRef<TR>, select?: TypeSelect<TR>): MethodDecorator;
export function Extension<TR>(scope: ClassRef, inputsOrResult: InputType | InputType[] | ResultType<TR>, resultOrSelect?: ResultType<TR> | TypeSelect<TR>, maybeSelect?: TypeSelect<TR>): MethodDecorator {
  return ResolverDecorator(Extension, MethodType.Extension, scope, inputsOrResult, resultOrSelect, maybeSelect);
}

function ResolverDecorator(
  decorator: Function,
  type: MethodType,
  scope: ClassRef,
  inputsOrResult: InputType | InputType[] | ResultType,
  resultOrSelect: ResultType | TypeSelect,
  mayBeSelect?: TypeSelect
): MethodDecorator {
  let inputs: InputType[];
  let result: ResultType;
  let select: TypeSelect;
  if (!resultOrSelect && !mayBeSelect) {
    inputs = undefined;
    result = inputsOrResult as any;
  } else if (inputsOrResult && resultOrSelect && !mayBeSelect) {
    inputs = (Array.isArray(inputsOrResult) ? inputsOrResult : [inputsOrResult]) as any;
    result = resultOrSelect as any;
  } else if (inputsOrResult && resultOrSelect && typeof resultOrSelect === 'object' && !Array.isArray(resultOrSelect)) {
    inputs = undefined;
    result = inputsOrResult as any;
    select = resultOrSelect as any;
  } else if (inputsOrResult && resultOrSelect && typeof mayBeSelect === 'object' && !Array.isArray(mayBeSelect)) {
    inputs = (Array.isArray(inputsOrResult) ? inputsOrResult : [inputsOrResult]) as any;
    result = resultOrSelect as any;
    select = mayBeSelect;
  } else {
    throw new TypeError('Assert');
  }

  return CoreDecorator.onMethod(decorator, { host: scope, inputs, result, select }, (target, propertyKey, descriptor) => {
    const oper = decorator.name.toLowerCase();
    const meta = MethodMetadata.define(target, propertyKey as string, descriptor).addAuth(oper, { Internal: true });
    meta.confirm(type, scope, inputs, result, select);
  });
}

export function GraphObject(): ParameterDecorator {
  return CoreDecorator.onParameter(GraphObject, {}, (target, propertyKey, parameterIndex) => {
    MethodMetadata.define(target, propertyKey as string).setArg(parameterIndex, Obj);
  });
}

export function ArgsObject(): ParameterDecorator {
  return CoreDecorator.onParameter(ArgsObject, {}, (target, propertyKey, parameterIndex) => {
    MethodMetadata.define(target, propertyKey as string).setArg(parameterIndex, Args);
  });
}

export function ReqTODO(): ParameterDecorator {
  return CoreDecorator.onParameter(ReqTODO, {}, (target, propertyKey, parameterIndex) => {
    // TODO
  });
}

export function ArgParam(): ParameterDecorator;
export function ArgParam(required: boolean): ParameterDecorator;
export function ArgParam(name: string): ParameterDecorator;
export function ArgParam(name: string, required: boolean): ParameterDecorator;
export function ArgParam(requiredOrName?: boolean | string, maybeName?: boolean): ParameterDecorator {
  return CoreDecorator.onParameter(ArgParam, { requiredOrName, maybeName }, (target, propertyKey, parameterIndex) => {
    // TODO: Add type in decorator
    MethodMetadata.define(target, propertyKey as string).setArg(parameterIndex, Any);
  });
}

export function CtxObject(): ParameterDecorator {
  return CoreDecorator.onParameter(CtxObject, {}, (target, propertyKey, parameterIndex) => {
    MethodMetadata.define(target, propertyKey as string).setArg(parameterIndex, Context);
  });
}

export function InfoObject(): ParameterDecorator {
  return CoreDecorator.onParameter(InfoObject, {}, (target, propertyKey, parameterIndex) => {
    MethodMetadata.define(target, propertyKey as string).setArg(parameterIndex, Info);
  });
}
