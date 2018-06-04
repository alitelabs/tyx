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

export function QlID(req?: boolean): PropertyDecorator {
    return Field(QlID.name, GraphType.ID, req);
}
export function QlInt(req?: boolean): PropertyDecorator {
    return Field(QlInt.name, GraphType.Int, req);
}
export function QlFloat(req?: boolean): PropertyDecorator {
    return Field(QlFloat.name, GraphType.Float, req);
}
export function QlString(req?: boolean): PropertyDecorator {
    return Field(QlString.name, GraphType.String, req);
}
export function QlOption(req?: boolean): PropertyDecorator {
    return Field(QlOption.name, GraphType.Option, req);
}
export function QlBoolean(req?: boolean): PropertyDecorator {
    return Field(QlBoolean.name, GraphType.Boolean, req);
}
export function QlDate(req?: boolean): PropertyDecorator {
    return Field(QlDate.name, GraphType.Date, req);
}
export function QlDateTime(req?: boolean): PropertyDecorator {
    return Field(QlDateTime.name, GraphType.DateTime, req);
}
export function QlTimestamp(req?: boolean): PropertyDecorator {
    return Field(QlTimestamp.name, GraphType.Date, req);
}
export function QlEmail(req?: boolean): PropertyDecorator {
    return Field(QlEmail.name, GraphType.Email, req);
}
export function QlObject(req?: boolean): PropertyDecorator {
    return Field(QlObject.name, GraphType.Object, req);
}
export function QlAny(req?: boolean): PropertyDecorator {
    return Field(QlAny.name, GraphType.ANY, req);
}
export function QlRef<T>(ref: TypeRef<T>, req?: boolean): PropertyDecorator {
    return Field(QlRef.name, GraphType.Ref, req, ref);
}
// export function QlInputItem(req?: boolean): PropertyDecorator {
//     return Field(QlInputItem.name, GraphType.InputItem, req);
// }
// export function QlResultItem(req?: boolean): PropertyDecorator {
//     return Field(QlResultItem.name, GraphType.ResultItem, req);
// }
export function QlArray<T>(item: GraphType | TypeRef<T>, req?: boolean): PropertyDecorator {
    return Field(QlArray.name, GraphType.List, req, item);
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