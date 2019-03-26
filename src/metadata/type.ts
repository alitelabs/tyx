import { Class, Prototype } from '../types/core';
import { Utils } from '../utils';
import { FieldMetadata, IFieldMetadata } from './field';
import { Metadata, MetadataRegistry } from './registry';
import { FieldType, IVarMetadata, VarKind, VarMetadata } from './var';

export type TypeSelect<T = any> = {
  // tslint:disable-next-line:prefer-array-literal
  [P in keyof T]?: T[P] extends Array<infer U>
  ? (TypeSelect<U> | true | false | 1 | 2)
  : T[P] extends ReadonlyArray<infer U>
  ? (TypeSelect<U> | true | false | 1 | 2)
  : (TypeSelect<T[P]> | true | false | 1 | 2)
};

export namespace TypeSelect {
  export function emit(meta: VarMetadata, select: TypeSelect | any, level: number, depth: number): string {
    if (level >= depth) return null;
    if (VarKind.isScalar(meta.kind)) return `# ${meta.js}`;
    if (VarKind.isRef(meta.kind)) return emit(meta.build, select, level, depth);
    if (VarKind.isArray(meta.kind)) return emit(meta.item, select, level, depth);
    // script += ` # [ANY]\n`;
    // #  NONE
    const type = meta as TypeMetadata;
    let script = `{`;
    let i = 0;
    for (const member of Object.values(type.members)) {
      if (VarKind.isVoid(member.kind)) continue;
      let name = member.name;
      let def = `# ${member.build.js}`;
      if (!VarKind.isScalar(member.kind) && !VarKind.isEnum(member.build.kind)) {
        def += ' ...';
        if (select instanceof Object && select[member.name]) {
          const sub = emit(member.build, select && select[member.name], level + 1, depth + 1);
          def = sub || def;
          if (!sub) name = '# ' + name;
        } else {
          name = '# ' + name;
        }
      }
      script += `${i++ ? ',' : ''}\n  ${name} ${def}`;
    }
    script += `\n`;
    return script;
  }
}

export interface ITypeMetadata extends IVarMetadata {
  name: string;
  target: Class;
  members: Record<string, IFieldMetadata>;
  ref?: never;
  item?: never;
  build?: never;
}

export class TypeMetadata implements ITypeMetadata {
  public kind: VarKind;
  public name: string;
  public target: Class = undefined;
  public members: Record<string, FieldMetadata> = undefined;
  public ref?: never;
  public item?: never;
  public build?: never;

  public gql?: string;
  public js?: string;
  public idl?: string;

  constructor(target: Class) {
    // super(undefined, target.name);
    if (!Utils.isClass(target)) throw new TypeError('Not a class');
    this.target = target;
    this.name = target.name;
  }

  public static has(target: Class | Prototype): boolean {
    return Reflect.hasOwnMetadata(MetadataRegistry.TYX_TYPE, target)
      || Reflect.hasOwnMetadata(MetadataRegistry.TYX_TYPE, target.constructor);
  }

  public static get(target: Class | Prototype): TypeMetadata {
    return Reflect.getOwnMetadata(MetadataRegistry.TYX_TYPE, target)
      || Reflect.getOwnMetadata(MetadataRegistry.TYX_TYPE, target.constructor);
  }

  public static define(target: Class): TypeMetadata {
    if (!Utils.isClass(target)) throw new TypeError('Not a class');
    if (Utils.baseClass(target) !== Object) throw new TypeError('Inheritance not supported');
    let meta = this.get(target);
    if (meta) return meta;
    meta = new TypeMetadata(target);
    Reflect.defineMetadata(MetadataRegistry.TYX_TYPE, meta, target);
    return meta;
  }

  public addField(propertyKey: string, type?: FieldType, required?: boolean): this {
    this.members = this.members || {};
    if (this.members[propertyKey]) throw new TypeError(`Duplicate field decoration on [${propertyKey}]`);
    const design = Reflect.getMetadata(MetadataRegistry.DESIGN_TYPE, this.target.prototype, propertyKey);
    let meta = VarMetadata.of(type || design, !type) as IFieldMetadata;
    if (!meta) {
      throw TypeError(`Design type of [${this.target.name}.${propertyKey}]: `
        + `[${design && design.name}] not in [String, Number, Boolean, Date]`);
    }
    if (process.env.NODE_ENV === 'development' && type && VarMetadata.DESIGN_TYPES.includes(design)) {
      const dt = VarMetadata.of(design);
      if (
        dt.kind !== meta.kind
        && !(meta.kind === VarKind.Int && design === Number)
        && !(meta.kind === VarKind.ID && design === String)
        && !(meta.kind === VarKind.Ref)
      ) {
        console.warn(`Field [${this.target.name}.${propertyKey}]: kind [${meta.kind}] <> design [${design && design.name}]`);
      }
    }
    meta = FieldMetadata.on(meta);
    meta.name = propertyKey;
    meta.mandatory = !!required;
    meta.design = design && { type: design.name, target: design };
    this.members[propertyKey] = meta;
    Reflect.defineMetadata(MetadataRegistry.TYX_MEMBER, meta, this.target.prototype, propertyKey);
    return this;
  }

  public commit(type?: VarKind, name?: string): this {
    // tslint:disable-next-line:no-parameter-reassignment
    name = name || this.target.name.replace(/Schema$/, '');
    // TODO: Support Inheritance
    // Copy members from base types
    this.kind = type;
    this.name = name || this.target.name;
    if (this.kind && !VarKind.isStruc(this.kind)) throw new TypeError(`Not a struct type: ${this.kind}`);
    // this.name = name;
    let prev: TypeMetadata;
    switch (type) {
      case VarKind.Metadata:
        prev = Metadata.Registry[this.target.name];
        if (prev && prev !== this) throw new TypeError(`Duplicate metadata class ${this.target.name}`);
        Metadata.Registry[this.target.name] = this;
        break;
      case VarKind.Input:
        prev = Metadata.Input[this.target.name];
        if (prev && prev !== this) throw new TypeError(`Duplicate input class ${this.target.name}`);
        Metadata.Input[this.target.name] = this;
        break;
      case VarKind.Type:
        prev = Metadata.Type[this.target.name];
        if (prev && prev !== this) throw new TypeError(`Duplicate type class ${this.target.name}`);
        Metadata.Type[this.target.name] = this;
        break;
      case VarKind.Entity:
        prev = Metadata.Entity[this.target.name];
        if (prev && prev !== this) throw new TypeError(`Duplicate entity class ${this.target.name}`);
        Metadata.Entity[this.target.name] = this as any;
        break;
      default:
        throw new TypeError(`Not Implemented: ${type}`);
    }
    return this;
  }
}
