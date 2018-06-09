import { Class, ObjectType, Prototype } from "../types/core";
import { DesignMetadata } from "./method";
import { Registry } from "./registry";

export class ID extends String { }
export class Int extends Number { }
export class Float extends Number { }
export class Any extends Object { }

export type Scalar =
    (new () => String)
    | (new () => ID)
    | (new () => Boolean)
    | (new () => Int)
    | (new () => Float)
    | (new () => Object)
    | (new () => Any)
    | (new () => Date);

export type ClassRef<T> = (type?: any) => (ObjectType<T> | [ObjectType<T>]);
export type VarType<T = any> = Scalar | [Scalar] | ClassRef<T> | EnumType;
export type InputType<T = any> = VarType<T> | [undefined];
export type ReturnType<T = any> = VarType<T>;

export enum GraphKind {
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
    Array = "Array",
    Enum = "Enum",
    // Roots
    Metadata = "Metadata",
    Input = "Input",
    Type = "Type",
    Entity = "Entity",
    // Ref
    Ref = "#REF",
    // Void
    Void = "#VOID"
}

export namespace GraphKind {
    export function isScalar(type: GraphKind | string) {
        switch (type) {
            case GraphKind.ID:
            case GraphKind.Int:
            case GraphKind.Float:
            case GraphKind.String:
            case GraphKind.Option:
            case GraphKind.Boolean:
            case GraphKind.Date:
            case GraphKind.DateTime:
            case GraphKind.Timestamp:
            case GraphKind.Email:
            case GraphKind.Object:
            case GraphKind.ANY:
            case GraphKind.Void:
                return true;
            default:
                return false;
        }
    }
    export function isStruc(type: GraphKind | string) {
        switch (type) {
            case GraphKind.Metadata:
            case GraphKind.Input:
            case GraphKind.Type:
            case GraphKind.Entity:
                return true;
            default:
                return false;
        }
    }
    export function isMetadata(type: GraphKind | string) {
        return type === GraphKind.Metadata;
    }
    export function isEntity(type: GraphKind | string) {
        return type === GraphKind.Entity;
    }
    export function isRef(type: GraphKind | string) {
        return type === GraphKind.Ref;
    }
    export function isArray(type: GraphKind | string) {
        return type === GraphKind.Array;
    }
    export function isVoid(type: GraphKind | string) {
        return type === GraphKind.Void;
    }
    export function isInput(type: GraphKind | string) {
        return type === GraphKind.Input;
    }
    export function isType(type: GraphKind | string) {
        return type === GraphKind.Type;
    }

    export function of(type: any) {
        switch (type) {
            case null:
            case undefined: return GraphKind.ANY;
            case String: return GraphKind.String;
            case ID: return GraphKind.ID;
            case Boolean: return GraphKind.Boolean;
            case Int: return GraphKind.Int;
            case Number: return GraphKind.Float;
            case Float: return GraphKind.Float;
            case Object: return GraphKind.Object;
            case Date: return GraphKind.Date;
            case Any: return GraphKind.ANY;
            default: return GraphKind.Ref;
        }
    }
}

export class EnumType {
    constructor(public target: Object) { }
}

export interface VarMetadata {
    kind: GraphKind;
    item?: VarMetadata;
    target?: Class;
    def?: string;
}

export namespace VarMetadata {
    export function of(type: VarType | InputType | ReturnType): VarMetadata {
        let list = false;
        if (Array.isArray(type)) {
            type = type[0];
            if (type === undefined) return { kind: GraphKind.Void };
            list = true;
        }
        let gt = GraphKind.of(type);
        let ref = GraphKind.isRef(gt);

        let meta: VarMetadata;
        if (type instanceof EnumType) meta = { kind: GraphKind.String, target: Object };
        else if (list && !ref) meta = { kind: GraphKind.Array, item: { kind: gt } };
        else if (list && ref) meta = { kind: GraphKind.Array, item: { kind: GraphKind.Ref, target: type } };
        else if (ref) meta = { kind: GraphKind.Ref, target: type };
        else meta = { kind: gt };
        return meta;
    }
}

export interface FieldMetadata extends VarMetadata {
    name: string;
    required: boolean;
    design?: DesignMetadata;
}

export interface ITypeMetadata extends VarMetadata {
    target: Class;
    name: string;
    item?: never;
    fields?: Record<string, FieldMetadata>;
}

export class TypeMetadata implements ITypeMetadata {
    public target: Class = undefined;
    public name: string = undefined;
    public kind: GraphKind = undefined;
    public def?: string;
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

    public addField(propertyKey: string, type: VarType, required: boolean): this {
        // TODO: Validata
        this.fields = this.fields || {};
        // TODO: use design type when not specified
        let design = Reflect.getMetadata(Registry.DESIGN_TYPE, this.target.prototype, propertyKey);
        let meta = VarMetadata.of(type) as FieldMetadata;
        meta.name = propertyKey;
        meta.required = required;
        meta.design = design && { type: design.name, target: design };
        this.fields[propertyKey] = meta;
        return this;
    }

    public commit(type: GraphKind, name?: string): this {
        this.kind = type;
        this.name = name || this.target.name;
        if (this.kind && !GraphKind.isStruc(this.kind)) throw new TypeError(`Not a struct type: ${this.kind}`);
        // this.name = name;
        switch (type) {
            case GraphKind.Metadata:
                Registry.RegistryMetadata[this.target.name] = this; break;
            case GraphKind.Input:
                Registry.InputMetadata[this.target.name] = this; break;
            case GraphKind.Type:
                Registry.TypeMetadata[this.target.name] = this; break;
            default:
                throw new TypeError(`Not Implemented: ${type}`);
        }
        return this;
    }
}