import { Registry } from "../metadata/registry";
import { GraphType, TypeMetadata } from "../metadata/type";
import { TypeRef } from "../types/core";

/// Root Types

export function Metadata(name?: string): ClassDecorator {
    return GraphClass(Metadata.name, GraphType.Metadata, name);
}

export function Input(name?: string): ClassDecorator {
    return GraphClass(Input.name, GraphType.Input, name);
}

export function InputItem(name?: string): ClassDecorator {
    return GraphClass(InputItem.name, GraphType.InputItem, name);
}

export function Result(name?: string): ClassDecorator {
    return GraphClass(Result.name, GraphType.Result, name);
}

export function ResultItem(name?: string): ClassDecorator {
    return GraphClass(ResultItem.name, GraphType.ResultItem, name);
}

export function Enum(target: object, name?: string): ClassDecorator {
    return GraphClass(Enum.name, GraphType.Enum, name);
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
export function Int(req?: boolean): PropertyDecorator {
    return Field(Int.name, GraphType.Int, req);
}
export function Float(req?: boolean): PropertyDecorator {
    return Field(Float.name, GraphType.Float, req);
}
export function Str(req?: boolean): PropertyDecorator {
    return Field(Str.name, GraphType.String, req);
}
export function Option(req?: boolean): PropertyDecorator {
    return Field(Option.name, GraphType.Option, req);
}
export function Bool(req?: boolean): PropertyDecorator {
    return Field(Bool.name, GraphType.Boolean, req);
}
export function Datum(req?: boolean): PropertyDecorator {
    return Field(Datum.name, GraphType.Date, req);
}
export function DateTime(req?: boolean): PropertyDecorator {
    return Field(DateTime.name, GraphType.DateTime, req);
}
export function Timestamp(req?: boolean): PropertyDecorator {
    return Field(Timestamp.name, GraphType.Date, req);
}
export function Email(req?: boolean): PropertyDecorator {
    return Field(Email.name, GraphType.Email, req);
}
export function Obj(req?: boolean): PropertyDecorator {
    return Field(Obj.name, GraphType.Object, req);
}
export function Any(req?: boolean): PropertyDecorator {
    return Field(Any.name, GraphType.ANY, req);
}
export function Ref<T>(ref: TypeRef<T>, req?: boolean): PropertyDecorator {
    return Field(Ref.name, GraphType.Ref, req, ref);
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
export function EnumField(req?: boolean): PropertyDecorator {
    return Field(EnumField.name, GraphType.Enum, req);
}

function Field(decorator: string, type: GraphType, required: boolean, item?: GraphType | TypeRef<any>): PropertyDecorator {
    return (target, propertyKey) => {
        if (typeof propertyKey !== "string") throw new TypeError("propertyKey must be string");
        Registry.trace(decorator, { type, required, item }, target, propertyKey);
        TypeMetadata.define(target.constructor).addField(propertyKey, type, required, item);
    };
}