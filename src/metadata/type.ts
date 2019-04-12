import { Utils } from 'exer';
import { Class, Prototype } from '../types/core';
import { FieldMetadata, IFieldMetadata } from './field';
import { MetadataRegistry, Registry } from './registry';
import { FieldType, IVarMetadata, IVarResolution, VarKind, VarMetadata, VarResolution, VarRole } from './var';

export type TypeSelect<T = any> = {
  // tslint:disable-next-line:prefer-array-literal
  [P in keyof T]?: T[P] extends Array<infer U>
  ? (TypeSelect<U> | true | false | 1 | 2)
  : T[P] extends ReadonlyArray<infer U>
  ? (TypeSelect<U> | true | false | 1 | 2)
  : (TypeSelect<T[P]> | true | false | 1 | 2)
};

export namespace TypeSelect {

  export function emit(meta: VarResolution, select: number): string;
  export function emit(meta: VarResolution, select: TypeSelect | number): string;
  export function emit(meta: VarResolution, select: TypeSelect | number): string {
    if (typeof select === 'number') return visit(meta, undefined, select, 0);
    return visit(meta, select, undefined, 0);
  }

  function visit(meta: VarResolution, select: TypeSelect, limit: number, level: number): string {
    if (level >= limit) return null;
    if (VarKind.isScalar(meta.kind)) return `# ${meta.js}`;
    if (VarKind.isRef(meta.kind)) return visit(meta.target.res, select, limit, level);
    if (VarKind.isArray(meta.kind)) return visit(meta.item, select, limit, level);
    // script += ` # [ANY]\n`;
    // #  NONE
    const type = meta.target as TypeMetadata;
    let script = `{`;
    let i = 0;
    for (const member of Object.values(type.members)) {
      if (VarKind.isVoid(member.kind)) continue;
      let name = member.name;
      let def = `# ${member.res.js}`;
      if (!VarKind.isScalar(member.kind) && !VarKind.isEnum(member.res.kind)) {
        def += ' ...';
        if (select instanceof Object && select[member.name]) {
          const sub = visit(
            member.res,
            (select as any)[member.name],
            limit,
            level + 1
          );
          def = sub || def;
          if (!sub) name = '# ' + name;
        } else if (limit) {
          const sub = visit(member.res, select, limit, level + 1);
          def = sub || def;
          if (!sub) name = '# ' + name;
        } else {
          name = '# ' + name;
        }
      }
      script += `${i++ ? ',' : ''}\n  ${name} ${Utils.indent(def, (level + 1) * 2).trimLeft()}`;
    }
    script += `\n}`;
    return script;
  }
}

export interface ITypeMetadata extends IVarMetadata {
  name: string;
  target: Class;
  members: Record<string, IFieldMetadata>;
  res?: IVarResolution;
  ref?: never;
}

export class TypeMetadata implements ITypeMetadata {
  public kind: VarKind;
  public name: string;
  public target: Class = undefined;
  public members: Record<string, FieldMetadata> = undefined;
  public res?: VarResolution;
  public ref?: never;

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

  public addField(role: VarRole, propertyKey: string, type?: FieldType, required?: boolean): this {
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
    meta.role = role;
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
        prev = Registry.CoreMetadata[this.target.name];
        if (prev && prev !== this) throw new TypeError(`Duplicate metadata class ${this.target.name}`);
        Registry.CoreMetadata[this.target.name] = this;
        break;
      case VarKind.Input:
        prev = Registry.InputMetadata[this.target.name];
        if (prev && prev !== this) throw new TypeError(`Duplicate input class ${this.target.name}`);
        Registry.InputMetadata[this.target.name] = this as any;
        break;
      case VarKind.Type:
        prev = Registry.TypeMetadata[this.target.name];
        if (prev && prev !== this) throw new TypeError(`Duplicate type class ${this.target.name}`);
        Registry.TypeMetadata[this.target.name] = this;
        break;
      case VarKind.Entity:
        prev = Registry.EntityMetadata[this.target.name];
        if (prev && prev !== this) throw new TypeError(`Duplicate entity class ${this.target.name}`);
        Registry.EntityMetadata[this.target.name] = this as any;
        break;
      default:
        throw new TypeError(`Not Implemented: ${type}`);
    }
    return this;
  }
}
