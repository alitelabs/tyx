import { Class, Context as Ctx, TypeRef } from '../types/core';
import { EnumMetadata, IEnumMetadata } from './enum';

export class ID extends String { }
export class Int extends Number { }
export class Float extends Number { }
export class Any extends Object { }

export type LiteralType =
  (new () => String)
  | (new () => ID)
  | (new () => Boolean)
  | (new () => Int)
  | (new () => Float)
  | (new () => Object)
  | (new () => Any)
  | (new () => Date);

export class Obj extends Object { }
export class Args extends Object { }
export { Ctx };
export class Info extends Object { }

export type Passtrough =
  (new () => Obj)
  | (new () => Args)
  | (new () => Ctx)
  | (new () => Info);

export type LiteralRef = (type?: any) => (LiteralType | [LiteralType]);
export type PasstroughRef<T = Passtrough> = (type?: any) => (Passtrough | [Passtrough]);
export type EnumRef = (ref?: any) => IEnumMetadata;
export type AtomicType = LiteralType | LiteralRef | EnumMetadata | EnumRef;

export type InputType<T = any> = AtomicType | TypeRef<T> | Passtrough | PasstroughRef<T>;
export type ResultType<T = any> = AtomicType | [LiteralType] | TypeRef<T>;
export type FieldType<T = any> = AtomicType | [LiteralType] | TypeRef<T>;

// tslint:disable-next-line:max-line-length
export type VarType<T = any> = LiteralType | [LiteralType] | LiteralRef | TypeRef<T> | EnumMetadata | EnumRef | Passtrough | PasstroughRef<T>;

// export type InputType<T = any> = VarType<T> | EnumRef;
// export type ResultType<T = any> = VarType<T>;

export enum VarRole {
  Field = 'Field',
  Column = 'Column',
  Serial = 'Serial',
  Value = 'Value',
  Tag = 'Tag'
}

export enum VarKind {
  ID = 'ID',
  Int = 'Int',
  Float = 'Float',
  String = 'String',
  // Option = 'String',
  Boolean = 'Boolean',
  Date = 'Date',
  DateTime = 'DateTime',
  Timestamp = 'Timestamp',
  Object = 'JSON',
  ANY = 'ANY',
  // Complex
  Array = 'Array',
  Enum = 'Enum',
  // Roots
  Metadata = 'Metadata',
  Input = 'Input',
  Type = 'Type',
  Entity = 'Entity',
  // Ref
  Ref = '#REF',
  // Void
  Void = '#VOID',
  // -------
  Obj = '$Obj',
  Args = '$Args',
  Ctx = '$Ctx',
  Info = '$Info'
}

export namespace VarKind {
  export function toJS(type: VarKind | string): string {
    switch (type) {
      case VarKind.ID:
      case VarKind.String:
        return 'string';
      case VarKind.Int:
      case VarKind.Float:
        return 'number';
      case VarKind.Boolean:
        return 'boolean';
      case VarKind.Date:
      case VarKind.DateTime:
      case VarKind.Timestamp:
        return 'Date';
      case VarKind.Object:
      case VarKind.ANY:
        return 'any';
      case VarKind.Void:
        return 'void';
      case VarKind.Obj:
      case VarKind.Args:
      case VarKind.Ctx:
      case VarKind.Info:
        return 'any';
      default:
        return null;
    }
  }

  export function toIDL(type: VarKind | string): string {
    switch (type) {
      case VarKind.ID:
        return 'ID';
      case VarKind.String:
        return 'String';
      case VarKind.Int:
        return 'Int';
      case VarKind.Float:
        return 'Float';
      case VarKind.Boolean:
        return 'Boolean';
      case VarKind.Date:
      case VarKind.DateTime:
      case VarKind.Timestamp:
        return 'Timestamp';
      case VarKind.Object:
      case VarKind.ANY:
        return 'Json';
      case VarKind.Void:
        return '#Void';
      case VarKind.Obj:
      case VarKind.Args:
      case VarKind.Ctx:
      case VarKind.Info:
        return 'Json';
      default:
        return null;
    }
  }

  export function toVar(type: VarKind | string): VarType {
    switch (type) {
      case VarKind.ID:
        return ID;
      case VarKind.String:
        return String;
      case VarKind.Int:
        return Int;
      case VarKind.Float:
        return Float;
      case VarKind.Boolean:
        return Boolean;
      case VarKind.Date:
      case VarKind.DateTime:
      case VarKind.Timestamp:
        return Date;
      case VarKind.Object:
        return Object;
      case VarKind.ANY:
        return Any;
      case VarKind.Void:
        return [undefined];
      case VarKind.Obj:
        return Obj;
      case VarKind.Args:
        return Args;
      case VarKind.Ctx:
        return Ctx;
      case VarKind.Info:
        return Info;
      default:
        return null;
    }
  }

  export function isScalar(type: VarKind | string) {
    switch (type) {
      case VarKind.ID:
      case VarKind.Int:
      case VarKind.Float:
      case VarKind.String:
      case VarKind.Boolean:
      case VarKind.Date:
      case VarKind.DateTime:
      case VarKind.Timestamp:
      case VarKind.Object:
      case VarKind.Enum:
      case VarKind.ANY:
      case VarKind.Void:
        return true;
      default:
        return false;
    }
  }

  export function isStruc(type: VarKind | string) {
    switch (type) {
      case VarKind.Metadata:
      case VarKind.Input:
      case VarKind.Type:
      case VarKind.Entity:
        return true;
      default:
        return false;
    }
  }
  export function isEnum(type: VarKind | string) {
    return type === VarKind.Enum;
  }
  export function isMetadata(type: VarKind | string) {
    return type === VarKind.Metadata;
  }
  export function isEntity(type: VarKind | string) {
    return type === VarKind.Entity;
  }
  export function isRef(type: VarKind | string) {
    return type === VarKind.Ref;
  }
  export function isArray(type: VarKind | string) {
    return type === VarKind.Array;
  }
  export function isVoid(type: VarKind | string) {
    return type === VarKind.Void;
  }
  export function isInput(type: VarKind | string) {
    return type === VarKind.Input;
  }
  export function isType(type: VarKind | string) {
    return type === VarKind.Type;
  }

  export function isResolver(type: VarKind | string) {
    switch (type) {
      case VarKind.Obj:
      case VarKind.Args:
      case VarKind.Ctx:
      case VarKind.Info:
        return true;
      default:
        return false;
    }
  }

  export function of(type: any) {
    switch (type) {
      case null:
      case undefined: return VarKind.ANY;
      case String: return VarKind.String;
      case ID: return VarKind.ID;
      case Boolean: return VarKind.Boolean;
      case Int: return VarKind.Int;
      case Number: return VarKind.Float;
      case Float: return VarKind.Float;
      case Object: return VarKind.Object;
      case Date: return VarKind.Date;
      case Any: return VarKind.ANY;
      case Obj: return VarKind.Obj;
      case Args: return VarKind.Args;
      case Ctx: return VarKind.Ctx;
      case Info: return VarKind.Info;
      default: return VarKind.Ref;
    }
  }
}

export interface IVarMetadata {
  kind: VarKind;
  name?: string;
  ref?: Class;
  item?: IVarMetadata;
  res?: IVarResolution;
}

export interface IVarResolution {
  kind: VarKind;
  target: IVarMetadata;
  item?: IVarResolution;
  // Names
  gql: string;
  js: string;
  idl: string;
}

export abstract class VarResolution implements IVarResolution {
  public kind: VarKind = undefined;
  public target: VarMetadata = undefined;
  public item?: VarResolution = undefined;

  public static of(target: VarMetadata, item?: VarResolution): VarResolution {
    const res: any = {
      kind: target && target.kind || VarKind.Object,
      target,
      item
    };
    Object.setPrototypeOf(res, VarResolution.prototype);
    return res;
  }

  // Names
  public get gql(): string {
    switch (this.kind) {
      case VarKind.Enum:
      case VarKind.Type:
      case VarKind.Input:
      case VarKind.Metadata:
      case VarKind.Entity:
        return this.target.name;
      case VarKind.Array:
        return this.item && `[${this.item.gql}]` || `[${VarKind.Object}]`;
      default: return this.kind;
    }
  }
  public get js(): string {
    switch (this.kind) {
      case VarKind.Enum:
      case VarKind.Type:
      case VarKind.Input:
      case VarKind.Metadata:
      case VarKind.Entity:
        return this.target.name;
      case VarKind.Array:
        return this.item && `${this.item.js}[]` || `any[]`;
      default: return VarKind.toJS(this.kind);
    }
  }
  public get idl(): string {
    switch (this.kind) {
      case VarKind.Enum:
      case VarKind.Type:
      case VarKind.Input:
      case VarKind.Metadata:
      case VarKind.Entity:
        return this.target.name;
      case VarKind.Array:
        return this.item && `list<${this.item.idl}>` || `list<Json>`;
      default: return VarKind.toIDL(this.kind);
    }
  }
}

export abstract class VarMetadata implements IVarMetadata {
  public kind: VarKind;
  public name?: string;
  public ref?: Class;
  public item?: VarMetadata;
  public res?: VarResolution;

  public static readonly DESIGN_TYPES: any[] = [String, Number, Boolean, Date];

  protected constructor(kind: VarKind, name?: string) {
    this.kind = kind;
    this.name = name;
  }

  public static on(meta: IVarMetadata) {
    return meta && Object.setPrototypeOf(meta, VarMetadata.prototype);
  }

  public static of(item: VarType, design?: boolean): VarMetadata {
    let type = item;
    if (design && !this.DESIGN_TYPES.includes(type)) return undefined;
    let list = false;
    if (Array.isArray(type)) {
      type = type[0];
      if (type === undefined) return this.on({ kind: VarKind.Void });
      list = true;
    }
    const gt = VarKind.of(type);
    const ref = VarKind.isRef(gt);

    let meta: IVarMetadata;
    if (type instanceof EnumMetadata) meta = this.on({ kind: VarKind.Ref, ref: () => type });
    else if (list && !ref) meta = this.on({ kind: VarKind.Array, item: this.on({ kind: gt }) });
    else if (list && ref) meta = this.on({ kind: VarKind.Array, item: this.on({ kind: VarKind.Ref, ref: type }) });
    else if (ref) meta = this.on({ kind: VarKind.Ref, ref: type });
    else meta = this.on({ kind: gt });
    return VarMetadata.on(meta);
  }
}
