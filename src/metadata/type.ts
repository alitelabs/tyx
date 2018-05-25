import { META_DESIGN_TYPE, META_TYX_TYPE, Metadata } from "./common";
import { DesignMetadata } from "./method";

export enum GraphType {
    ID = "ID",
    Int = "Int",
    Float = "Float",
    String = "String",
    Option = "String",
    Boolean = "Boolean",
    Date = "Date",
    DateTime = "DateTime",
    Timestamp = "Timestamp",
    Email = "Email",
    Object = "JSON",
    ANY = "ANY",
    // Complex
    List = "List",
    Enum = "Enum",
    // Items
    InputItem = "InputItem",
    ResultItem = "ResultItem",
    // Roots
    Input = "Input",
    Result = "Result",
    Entity = "Entity",
    // Ref
    Ref = "#REF"
}

export namespace GraphType {
    export function isScalar(type: GraphType) {
        switch (type) {
            case GraphType.ID:
            case GraphType.Int:
            case GraphType.Float:
            case GraphType.String:
            case GraphType.Option:
            case GraphType.Boolean:
            case GraphType.Date:
            case GraphType.DateTime:
            case GraphType.Timestamp:
            case GraphType.Email:
            case GraphType.Object:
            case GraphType.ANY:
                return true;
            default:
                return false;
        }
    }
    export function isStruc(type: GraphType) {
        switch (type) {
            case GraphType.Input:
            case GraphType.InputItem:
            case GraphType.Result:
            case GraphType.ResultItem:
            case GraphType.Entity:
                return true;
            default:
                return false;
        }
    }
    export function isEntity(type: GraphType) {
        return type === GraphType.Entity;
    }
    export function isRef(type: GraphType) {
        return type === GraphType.Ref;
    }
    export function isList(type: GraphType) {
        return type === GraphType.List;
    }
    export function isItem(type: GraphType) {
        switch (type) {
            case GraphType.InputItem:
            case GraphType.ResultItem:
                return true;
            default:
                return false;
        }
    }
    export function isInput(type: GraphType) {
        switch (type) {
            case GraphType.Input:
            case GraphType.InputItem:
                return true;
            default:
                return false;
        }
    }
    export function isResult(type: GraphType) {
        switch (type) {
            case GraphType.Result:
            case GraphType.ResultItem:
                return true;
            default:
                return false;
        }
    }
}

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
        return void TypeMetadata.resolve(target, type, name);
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
        TypeMetadata.append(target, propertyKey, type, required, item);
    };
}

export interface TypeMetadata {
    api?: string;
    type: GraphType;
    item?: TypeMetadata;
    target?: Function;
    name?: string;
    schema?: string;
}

export interface StrucMetadata extends TypeMetadata {
    fields?: Record<string, FieldMetadata>;
}

export interface FieldMetadata extends TypeMetadata {
    key: string;
    required: boolean;
    design: DesignMetadata;
}

export namespace TypeMetadata {
    export function has(target: Function | Object): boolean {
        return Reflect.hasMetadata(META_TYX_TYPE, target)
            || Reflect.hasMetadata(META_TYX_TYPE, target.constructor);
    }

    export function get(target: Function | Object): TypeMetadata {
        return Reflect.getMetadata(META_TYX_TYPE, target)
            || Reflect.getMetadata(META_TYX_TYPE, target.constructor);
    }

    export function init(target: Function): TypeMetadata {
        let meta = get(target);
        if (!meta) {
            meta = { api: undefined, type: undefined };
            Reflect.defineMetadata(META_TYX_TYPE, meta, target);
        }
        return meta;
    }

    export function append(target: Object, propertyKey: string, type: GraphType, required: boolean, item?: GraphType | Function) {
        // TODO: Validata
        let meta = TypeMetadata.init(target.constructor) as StrucMetadata;
        meta.fields = meta.fields || {};
        // TODO: use design type when not specified
        let design = Reflect.getMetadata(META_DESIGN_TYPE, target, propertyKey);
        let itemInfo: TypeMetadata = typeof item === "function"
            ? { type: GraphType.Ref, target: item }
            : { type: item };
        meta.fields[propertyKey] = {
            type,
            item: item && itemInfo,
            key: propertyKey,
            required,
            design: { type: design.name, target: design }
        };
    }

    export function resolve(target: Function, type: GraphType, name?: string): TypeMetadata {
        if (type && !GraphType.isStruc(type) && !GraphType.isItem(type)) throw new TypeError(`Not a root type: ${type}`);
        let meta = init(target);
        meta.type = type;
        meta.target = target;
        return meta;
    }
}