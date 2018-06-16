import { Registry } from '../metadata/registry';
import { EnumMetadata, GraphKind, TypeMetadata, VarType } from '../metadata/type';

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

/// Fields

// export function DateTime(req?: boolean): PropertyDecorator {
//     return AField(DateTime.name, GraphType.DateTime, req);
// }
// export namespace DateTime {
//     export const Type = GraphType.DateTime;
// }

// export function Timestamp(req?: boolean): PropertyDecorator {
//     return AField(Timestamp.name, GraphType.Date, req);
// }
// export namespace Timestamp {
//     export const Type = GraphType.Timestamp;
// }

// export function Email(req?: boolean): PropertyDecorator {
//     return AField(Email.name, GraphType.Email, req);
// }
// export namespace Email {
//     export const Type = GraphType.Email;
// }

// export function EnumField(req?: boolean): PropertyDecorator {
//     return AField(EnumField.name, GraphType.Enum, req);
// }
// export namespace EnumField {
//     export const Type = GraphType.Enum;
// }

// function AField(decorator: string, type: GraphType, required: boolean, item?: GraphType | TypeRef<any>): PropertyDecorator {
//     return (target, propertyKey) => {
//         if (typeof propertyKey !== "string") throw new TypeError("propertyKey must be string");
//         Registry.trace(decorator, { type, required, item }, target, propertyKey);
//         TypeMetadata.define(target.constructor).addField(propertyKey, type, required, item);
//     };
// }

export function Field<T = any>(type: VarType<T>, required?: boolean): PropertyDecorator {
  return (target, propertyKey) => {
    if (typeof propertyKey !== 'string') throw new TypeError('propertyKey must be string');
    Registry.trace(Field, { type, required }, target, propertyKey);
    TypeMetadata.define(target.constructor).addField(propertyKey, type, required);
  };
}
