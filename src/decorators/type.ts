import { Registry } from '../metadata/registry';
import { EnumMetadata, GraphKind, Int, TypeMetadata, VarType } from '../metadata/type';

// tslint:disable:function-name

/// Root Types
export function Metadata(name?: string): ClassDecorator {
  return TypeClass(Metadata.name, GraphKind.Metadata, name);
}

export function Input(name?: string): ClassDecorator {
  return TypeClass(Input.name, GraphKind.Input, name);
}

export function Type(name?: string): ClassDecorator {
  return TypeClass(Type.name, GraphKind.Type, name);
}

function TypeClass(decorator: string, type: GraphKind, name?: string): ClassDecorator {
  return (target) => {
    Registry.trace(decorator, { type, name }, target);
    // tslint:disable-next-line:no-parameter-reassignment
    if (type === GraphKind.Metadata) name = name || target.name.replace(/Schema$/, '');
    return void TypeMetadata.define(target).commit(type, name);
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
