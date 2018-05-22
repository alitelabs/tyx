import { GraphMetadata, META_DESIGN_TYPE, TypeInfo } from "../metadata";
import { GraphType } from "../types";

export function Input(name?: string): ClassDecorator {
    return (target) => void GraphMetadata.define(target, GraphType.Input, name);
}

export function InputItem(name?: string): ClassDecorator {
    return (target) => void GraphMetadata.define(target, GraphType.InputItem, name);
}

export function Result(name?: string): ClassDecorator {
    return (target) => void GraphMetadata.define(target, GraphType.Result, name);
}

export function ResultItem(name?: string): ClassDecorator {
    return (target) => void GraphMetadata.define(target, GraphType.ResultItem, name);
}

export function Enum(name?: string): ClassDecorator {
    return (target) => void GraphMetadata.define(target, GraphType.Enum, name);
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
        // TODO: use design type when not specified
        let design = Reflect.getMetadata(META_DESIGN_TYPE, target, propertyKey);
        // TODO: Validata
        let meta = GraphMetadata.define(target.constructor);
        let itemInfo: TypeInfo = typeof item === "function"
            ? { type: item.name, constructor: item }
            : { type: item, constructor: null };
        meta.fields[propertyKey] = {
            type,
            item: itemInfo,
            name: propertyKey,
            required,
            design: { type: design.name, constructor: design }
        };
    };
}