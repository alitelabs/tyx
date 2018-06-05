import { Registry } from "../metadata/registry";
import { GraphType, TypeMetadata } from "../metadata/type";
import { TypeRef } from "../types/core";

/// Root Types

export function Metadata(name?: string): ClassDecorator {
    return GraphClass(Metadata.name, GraphType.Metadata, name);
}
export namespace Metadata {
    export const Type = GraphType.Metadata;
}

export function Input(name?: string): ClassDecorator {
    return GraphClass(Input.name, GraphType.Input, name);
}
export namespace Input {
    export const Type = GraphType.Input;
}

export function InputItem(name?: string): ClassDecorator {
    return GraphClass(InputItem.name, GraphType.InputItem, name);
}
export namespace InputItem {
    export const Type = GraphType.InputItem;
}

export function Result(name?: string): ClassDecorator {
    return GraphClass(Result.name, GraphType.Result, name);
}
export namespace Result {
    export const Type = GraphType.Result;
}

export function ResultItem(name?: string): ClassDecorator {
    return GraphClass(ResultItem.name, GraphType.ResultItem, name);
}
export namespace ResultItem {
    export const Type = GraphType.ResultItem;
}

export function Enum(target: object, name?: string): ClassDecorator {
    return GraphClass(Enum.name, GraphType.Enum, name);
}
export namespace Enum {
    export const Type = GraphType.Enum;
}

function GraphClass(decorator: string, type: GraphType, name?: string): ClassDecorator {
    return (target) => {
        Registry.trace(decorator, { type, name }, target);
        if (type === GraphType.Metadata) name = name || target.name.replace(/Schema$/, "");
        return void TypeMetadata.define(target).commit(type, name);
    };
}

/// Fields

export function ID(req?: boolean): PropertyDecorator {
    return Field(ID.name, GraphType.ID, req);
}
export namespace ID {
    export const Type = GraphType.ID;
}

export function Int(req?: boolean): PropertyDecorator {
    return Field(Int.name, GraphType.Int, req);
}
export namespace Int {
    export const Type = GraphType.Int;
}

export function Float(req?: boolean): PropertyDecorator {
    return Field(Float.name, GraphType.Float, req);
}
export namespace Float {
    export const Type = GraphType.Float;
}

export function Str(req?: boolean): PropertyDecorator {
    return Field(Str.name, GraphType.String, req);
}
export namespace Str {
    export const Type = GraphType.String;
}

export function Option(req?: boolean): PropertyDecorator {
    return Field(Option.name, GraphType.Option, req);
}
export namespace Option {
    export const Type = GraphType.Option;
}

export function Bool(req?: boolean): PropertyDecorator {
    return Field(Bool.name, GraphType.Boolean, req);
}
export namespace Bool {
    export const Type = GraphType.Boolean;
}

export function Datum(req?: boolean): PropertyDecorator {
    return Field(Datum.name, GraphType.Date, req);
}
export namespace Datum {
    export const Type = GraphType.Date;
}

export function DateTime(req?: boolean): PropertyDecorator {
    return Field(DateTime.name, GraphType.DateTime, req);
}
export namespace DateTime {
    export const Type = GraphType.DateTime;
}

export function Timestamp(req?: boolean): PropertyDecorator {
    return Field(Timestamp.name, GraphType.Date, req);
}
export namespace Timestamp {
    export const Type = GraphType.Timestamp;
}

export function Email(req?: boolean): PropertyDecorator {
    return Field(Email.name, GraphType.Email, req);
}
export namespace Email {
    export const Type = GraphType.Email;
}

export function Obj(req?: boolean): PropertyDecorator {
    return Field(Obj.name, GraphType.Object, req);
}
export namespace Obj {
    export const Type = GraphType.Object;
}

export function Any(req?: boolean): PropertyDecorator {
    return Field(Any.name, GraphType.ANY, req);
}
export namespace Any {
    export const Type = GraphType.ANY;
}

export function Ref<T>(ref: TypeRef<T>, req?: boolean): PropertyDecorator {
    return Field(Ref.name, GraphType.Ref, req, ref);
}
export namespace Ref {
    export const Type = GraphType.Ref;
}

// export function QlInputItem(req?: boolean): PropertyDecorator {
//     return Field(QlInputItem.name, GraphType.InputItem, req);
// }
// export function QlResultItem(req?: boolean): PropertyDecorator {
//     return Field(QlResultItem.name, GraphType.ResultItem, req);
// }
export function List<T>(item: GraphType | TypeRef<T>, req?: boolean): PropertyDecorator {
    return Field(List.name, GraphType.List, req, item);
}
export namespace List {
    export const Type = GraphType.List;
}

export function EnumField(req?: boolean): PropertyDecorator {
    return Field(EnumField.name, GraphType.Enum, req);
}
export namespace EnumField {
    export const Type = GraphType.Enum;
}

function Field(decorator: string, type: GraphType, required: boolean, item?: GraphType | TypeRef<any>): PropertyDecorator {
    return (target, propertyKey) => {
        if (typeof propertyKey !== "string") throw new TypeError("propertyKey must be string");
        Registry.trace(decorator, { type, required, item }, target, propertyKey);
        TypeMetadata.define(target.constructor).addField(propertyKey, type, required, item);
    };
}