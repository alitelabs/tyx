import { Class, Prototype, TypeRef } from "../types/core";
import { DesignMetadata } from "./method";
import { Registry } from "./registry";

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
    Metadata = "Metadata",
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
            case GraphType.Metadata:
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
    export function isMetadata(type: GraphType) {
        return type === GraphType.Metadata;
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

export interface GraphMetadata {
    type: GraphType;
    item?: GraphMetadata;
    target?: Class;
}

export interface FieldMetadata extends GraphMetadata {
    name: string;
    required: boolean;
    design: DesignMetadata;
}

export interface TypeMetadata extends GraphMetadata {
    target: Class;
    name: string;
    item?: never;
    fields?: Record<string, FieldMetadata>;
}

export class TypeMetadata {
    public target: Class = undefined;
    public type: GraphType = undefined;
    public name: string = undefined;
    // public ref?: string = undefined;
    // public schema?: string = undefined;
    public fields?: Record<string, FieldMetadata> = undefined;

    constructor(target: Class) {
        this.target = target;
    }

    public static has(target: Class | Prototype): boolean {
        return Reflect.hasMetadata(Registry.TYX_TYPE, target)
            || Reflect.hasMetadata(Registry.TYX_TYPE, target.constructor);
    }

    public static get(target: Class | Prototype): TypeMetadata {
        return Reflect.getMetadata(Registry.TYX_TYPE, target)
            || Reflect.getMetadata(Registry.TYX_TYPE, target.constructor);
    }

    public static define(target: Class): TypeMetadata {
        let meta = this.get(target);
        if (!meta) {
            meta = new TypeMetadata(target);
            Reflect.defineMetadata(Registry.TYX_TYPE, meta, target);
        }
        return meta;
    }

    public addField(propertyKey: string, type: GraphType, required: boolean, item?: GraphType | TypeRef<any>): this {
        // TODO: Validata
        this.fields = this.fields || {};
        // TODO: use design type when not specified
        let design = Reflect.getMetadata(Registry.DESIGN_TYPE, this.target.prototype, propertyKey);
        let itemInfo: GraphMetadata = undefined;
        if (type === GraphType.List)
            itemInfo = typeof item === "function"
                ? { type: GraphType.Ref, target: item }
                : { type: item as GraphType };
        this.fields[propertyKey] = {
            type,
            name: propertyKey,
            item: item && itemInfo,
            target: (type === GraphType.Ref) ? item as any : undefined,
            required,
            design: { type: design.name, target: design }
        };
        return this;
    }

    public commit(type: GraphType, name?: string): this {
        this.type = type;
        this.name = name || this.target.name;
        if (this.type && !GraphType.isStruc(this.type)) throw new TypeError(`Not a struct type: ${this.type}`);
        // this.name = name;
        switch (type) {
            case GraphType.Metadata:
                Registry.metadata[this.target.name] = this; break;
            case GraphType.Result:
            case GraphType.ResultItem:
                Registry.results[this.target.name] = this; break;
            case GraphType.Input:
            case GraphType.InputItem:
                Registry.inputs[this.target.name] = this; break;
            default:
                throw new TypeError(`Not Implemented: ${type}`);
        }
        return this;
    }
}