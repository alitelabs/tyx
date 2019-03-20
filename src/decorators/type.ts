import { EnumMetadata } from '../metadata/enum';
import { Metadata } from '../metadata/registry';
import { TypeMetadata } from '../metadata/type';
import { FieldType, Int, VarKind } from '../metadata/var';

// tslint:disable:function-name

export function Input(name?: string): ClassDecorator {
  return Metadata.onClass(Input, { type: VarKind.Type, name }, (target) => {
    TypeMetadata.define(target).commit(VarKind.Input, name);
  });
}
Input.core = true;

export function Type(name?: string): ClassDecorator {
  return Metadata.onClass(Type, { type: VarKind.Type, name }, (target) => {
    TypeMetadata.define(target).commit(VarKind.Type, name);
  });
}
Type.core = true;

export function Enum(target: Object, name?: string): EnumMetadata {
  return EnumMetadata.define(target, name);
}
Enum.core = true;

// export function Field(target: Object, propertyKey: string): void;
export function Field<T = any>(): PropertyDecorator;
export function Field<T = any>(type: FieldType<T> | 0): PropertyDecorator;
export function Field<T = any>(required?: boolean): PropertyDecorator;
export function Field<T = any>(type?: FieldType<T> | 0, required?: boolean): PropertyDecorator;
export function Field<T = any>(first?: FieldType<T> | 0 | boolean | Object, second?: boolean | string | symbol): PropertyDecorator | void {
  return Metadata.onProperty(Field, { first, second }, (target, propertyKey) => {
    let type: FieldType<T> = undefined;
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
    TypeMetadata.define(target.constructor).addField(propertyKey as string, type, required);
  });
}
Field.core = true;
