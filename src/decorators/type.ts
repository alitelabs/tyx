import { Metadata } from "../metadata/common";
import { GraphType, TypeMetadata } from "../metadata/type";

/// Root Types

export function Input(name?: string): ClassDecorator {
    return GraphClass(GraphType.Input, name);
}

export function InputItem(name?: string): ClassDecorator {
    return GraphClass(GraphType.InputItem, name);
}

export function Result(name?: string): ClassDecorator {
    return GraphClass(GraphType.Result, name);
}

export function ResultItem(name?: string): ClassDecorator {
    return GraphClass(GraphType.ResultItem, name);
}

export function Enum(name?: string): ClassDecorator {
    return GraphClass(GraphType.Enum, name);
}

function GraphClass(type: GraphType, name?: string): ClassDecorator {
    return (target) => {
        Metadata.trace(type, { name }, target);
        return void TypeMetadata.define(target).commit(type, name);
    };
}

/// Fields

export function IDField(req?: boolean): PropertyDecorator {
    return Field(GraphType.ID, req);
}
export function IntField(req?: boolean): PropertyDecorator {
    return Field(GraphType.Int, req);
}
export function FloatField(req?: boolean): PropertyDecorator {
    return Field(GraphType.Float, req);
}
export function StringField(req?: boolean): PropertyDecorator {
    return Field(GraphType.String, req);
}
export function OptionField(req?: boolean): PropertyDecorator {
    return Field(GraphType.Option, req);
}
export function BooleanField(req?: boolean): PropertyDecorator {
    return Field(GraphType.Boolean, req);
}
export function DateField(req?: boolean): PropertyDecorator {
    return Field(GraphType.Date, req);
}
export function DateTimeField(req?: boolean): PropertyDecorator {
    return Field(GraphType.DateTime, req);
}
export function TimestampField(req?: boolean): PropertyDecorator {
    return Field(GraphType.Date, req);
}
export function EmailField(req?: boolean): PropertyDecorator {
    return Field(GraphType.Email, req);
}
export function ObjectField(req?: boolean): PropertyDecorator {
    return Field(GraphType.Object, req);
}
export function AnyField(req?: boolean): PropertyDecorator {
    return Field(GraphType.ANY, req);
}
export function InputItemField(req?: boolean): PropertyDecorator {
    return Field(GraphType.InputItem, req);
}
export function ResultItemField(req?: boolean): PropertyDecorator {
    return Field(GraphType.ResultItem, req);
}
export function ListField(item: GraphType | Function, req?: boolean): PropertyDecorator {
    return Field(GraphType.List, req, item);
}
export function EnumField(req?: boolean): PropertyDecorator {
    return Field(GraphType.Enum, req);
}

function Field(type: GraphType, required: boolean, item?: GraphType | Function): PropertyDecorator {
    return (target, propertyKey) => {
        if (typeof propertyKey !== "string") throw new TypeError("propertyKey must be string");
        Metadata.trace(type, { required, item }, target, propertyKey);
        TypeMetadata.define(target.constructor).addField(propertyKey, type, required, item);
    };
}