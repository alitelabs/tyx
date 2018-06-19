import { Registry } from '../metadata/registry';
import { EnumMetadata, GraphKind, Int, TypeMetadata, VarType } from '../metadata/type';

// tslint:disable:function-name

export function Input(name?: string): ClassDecorator {
  return (target) => {
    Registry.trace(Input, { type: GraphKind.Type, name }, target);
    return void TypeMetadata.define(target).commit(GraphKind.Input, name);
  };
}

export function Type(name?: string): ClassDecorator {
  return (target) => {
    Registry.trace(Type, { type: GraphKind.Type, name }, target);
    return void TypeMetadata.define(target).commit(GraphKind.Type, name);
  };
}

export function Enum(target: Object, name?: string): EnumMetadata {
  return EnumMetadata.define(target, name);
}

export function Field(target: Object, propertyKey: string): void;
export function Field<T = any>(): PropertyDecorator;
export function Field<T = any>(type: VarType<T> | 0): PropertyDecorator;
export function Field<T = any>(required?: boolean): PropertyDecorator;
export function Field<T = any>(type?: VarType<T> | 0, required?: boolean): PropertyDecorator;
export function Field<T = any>(first?: VarType<T> | 0 | boolean | Object, second?: boolean | string | symbol): PropertyDecorator | void {
  if (typeof second === 'symbol') throw new TypeError('propertyKey must be string');
  if (typeof first === 'object' && typeof second === 'string') {
    return void decorator(first, second);
  }
  return decorator;
  function decorator(target: Object, propertyKey: string | symbol) {
    let type: VarType<T> = undefined;
    let required = false;
    if (typeof first === 'boolean') {
      required = first;
    } else if (first === 0) {
      type = Int;
      required = second as any;
    } else {
      type = first as any;
      required = second as any;
    }
    if (typeof propertyKey !== 'string') throw new TypeError('propertyKey must be string');
    Registry.trace(Field, { type, required }, target, propertyKey);
    TypeMetadata.define(target.constructor).addField(propertyKey, type, required);
  }
}
