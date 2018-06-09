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
export type VarType<T = any> = Scalar | [Scalar] | ClassRef<T> | EnumMetadata;
export type InputType<T = any> = VarType<T> | [undefined] | ((ref?: any) => IEnumMetadata);
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
    export function isEnum(type: GraphKind | string) {
        return type === GraphKind.Enum;
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

export interface VarMetadata {
    kind: GraphKind;
    item?: VarMetadata;
    ref?: Class;
    def?: string;
}

export interface IEnumMetadata extends VarMetadata {
    name: string;
    item?: never;
    ref: Function;
}

export class EnumMetadata implements IEnumMetadata {
    public kind = GraphKind.Enum;
    public name: string;
    public ref: Function;
    constructor(target: Object, name: string) {
        if (!name) throw new TypeError("Unnamed enum");
        this.name = name;
        this.ref = () => target;
    }

    public static has(target: Object): boolean {
        return Reflect.hasMetadata(Registry.TYX_ENUM, target);
    }

    public static get(target: Object): EnumMetadata {
        return Reflect.getMetadata(Registry.TYX_ENUM, target);
    }

    public static define(target: Object, name?: string): EnumMetadata {
        let meta = this.get(target);
        if (!meta) {
            meta = new EnumMetadata(target, name);
            Reflect.defineMetadata(Registry.TYX_ENUM, meta, target);
            if (Registry.EntityMetadata[name]) throw new TypeError(`Duplicate enum name: ${name}`);
            Registry.EnumMetadata[name] = meta;
        } else if (name && name !== meta.name) {
            throw new TypeError(`Can not rename enum from: ${meta.name} to: ${name}`);
        }
        return meta;
    }
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
        if (type instanceof EnumMetadata) meta = { kind: GraphKind.Ref, ref: () => type };
        else if (list && !ref) meta = { kind: GraphKind.Array, item: { kind: gt } };
        else if (list && ref) meta = { kind: GraphKind.Array, item: { kind: GraphKind.Ref, ref: type } };
        else if (ref) meta = { kind: GraphKind.Ref, ref: type };
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
    ref: Class;
    name: string;
    item?: never;
    fields?: Record<string, FieldMetadata>;
}

export class TypeMetadata implements ITypeMetadata {
    public ref: Class = undefined;
    public name: string = undefined;
    public kind: GraphKind = undefined;
    public def?: string;
    public fields?: Record<string, FieldMetadata> = undefined;

    constructor(target: Class) {
        this.ref = target;
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
        let design = Reflect.getMetadata(Registry.DESIGN_TYPE, this.ref.prototype, propertyKey);
        let meta = VarMetadata.of(type) as FieldMetadata;
        meta.name = propertyKey;
        meta.required = required;
        meta.design = design && { type: design.name, target: design };
        this.fields[propertyKey] = meta;
        return this;
    }

    public commit(type: GraphKind, name?: string): this {
        this.kind = type;
        this.name = name || this.ref.name;
        if (this.kind && !GraphKind.isStruc(this.kind)) throw new TypeError(`Not a struct type: ${this.kind}`);
        // this.name = name;
        switch (type) {
            case GraphKind.Metadata:
                Registry.RegistryMetadata[this.ref.name] = this; break;
            case GraphKind.Input:
                Registry.InputMetadata[this.ref.name] = this; break;
            case GraphKind.Type:
                Registry.TypeMetadata[this.ref.name] = this; break;
            default:
                throw new TypeError(`Not Implemented: ${type}`);
        }
        return this;
    }
}