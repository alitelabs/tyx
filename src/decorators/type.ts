import { EnumMetadata } from '../metadata/enum';
import { CoreDecorator } from '../metadata/registry';
import { TypeMetadata } from '../metadata/type';
import { AtomicType, FieldType, Int, VarKind, VarRole } from '../metadata/var';

// tslint:disable:function-name

export function Input(name?: string): ClassDecorator {
  return CoreDecorator.onClass(Input, { type: VarKind.Type, name }, (target) => {
    TypeMetadata.define(target).commit(VarKind.Input, name);
  });
}
Input.core = true;

export function Type(name?: string): ClassDecorator {
  return CoreDecorator.onClass(Type, { type: VarKind.Type, name }, (target) => {
    TypeMetadata.define(target).commit(VarKind.Type, name);
  });
}
Type.core = true;

export function Enum(target: Object, name?: string): EnumMetadata {
  return EnumMetadata.define(target, name);
}
Enum.core = true;

// TODO: Restring to numner and Date
export function Serial<T = any>(): PropertyDecorator;
export function Serial<T = any>(type: FieldType<T> | 0): PropertyDecorator;
export function Serial<T = any>(first?: FieldType<T> | 0 | boolean | Object): PropertyDecorator | void {
  return field(Serial, first, true);
}
Serial.core = true;

export function Tag(): PropertyDecorator;
export function Tag(type: AtomicType | 0): PropertyDecorator;
export function Tag(required?: boolean): PropertyDecorator;
export function Tag(type?: AtomicType | 0, required?: boolean): PropertyDecorator;
export function Tag(first?: AtomicType | 0 | boolean | Object, second?: boolean | string | symbol): PropertyDecorator | void {
  return field(Tag, first, second);
}
Tag.core = true;

export function Value(): PropertyDecorator;
export function Value(type: AtomicType | 0): PropertyDecorator;
export function Value(required?: boolean): PropertyDecorator;
export function Value(type?: AtomicType | 0, required?: boolean): PropertyDecorator;
export function Value(first?: AtomicType | 0 | boolean | Object, second?: boolean | string | symbol): PropertyDecorator | void {
  return field(Value, first, second);
}
Value.core = true;

// export function Field(target: Object, propertyKey: string): void;
export function Field<T = any>(): PropertyDecorator;
export function Field<T = any>(type: FieldType<T> | 0): PropertyDecorator;
export function Field<T = any>(required?: boolean): PropertyDecorator;
export function Field<T = any>(type?: FieldType<T> | 0, required?: boolean): PropertyDecorator;
export function Field<T = any>(first?: FieldType<T> | 0 | boolean | Object, second?: boolean | string | symbol): PropertyDecorator | void {
  return field(Field, first, second);
}
Field.core = true;

function field<T = any>(
  role: Function, first?: FieldType<T> | 0 | boolean | Object, second?: boolean | string | symbol
): PropertyDecorator | void {
  return CoreDecorator.onProperty(role, { first, second }, (target, propertyKey) => {
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
    TypeMetadata.define(target.constructor).addField(role.name as VarRole, propertyKey as string, type, required);
  });
}
