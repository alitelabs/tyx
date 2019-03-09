import { Logger } from '../logger';
import { Class } from '../types/core';
import * as Utils from '../utils/misc';
import { ApiMetadata } from './api';
import { ColumnMetadata } from './column';
import { DatabaseMetadata } from './database';
import { EntityMetadata } from './entity';
import { EventRouteMetadata, HttpRouteMetadata, MethodMetadata } from './method';
import { ProxyMetadata } from './proxy';
import { RelationMetadata } from './relation';
import { ServiceMetadata } from './service';
import { EnumMetadata, GraphKind, TypeMetadata, VarMetadata } from './type';

export interface DecorationMetadata {
  decorator: string;
  ordinal: number;
  target?: Class;
  propertyKey?: string;
  index?: number;
  args: Record<string, any>;
}

export interface DecoratorMetadata {
  decorator: string;
  count: number;
  targets: Record<string, Class>;
}

export interface MetadataRegistry {
  RegistryMetadata: Record<string, TypeMetadata>;
  DecoratorMetadata: Record<string, DecoratorMetadata>;
  DecorationMetadata: DecorationMetadata[];

  ApiMetadata: Record<string, ApiMetadata>;
  ServiceMetadata: Record<string, ServiceMetadata>;
  ProxyMetadata: Record<string, ProxyMetadata>;

  DatabaseMetadata: Record<string, DatabaseMetadata>;
  EntityMetadata: Record<string, EntityMetadata>;
  ColumnMetadata: Record<string, ColumnMetadata>;
  RelationMetadata: Record<string, RelationMetadata>;

  EnumMetadata: Record<string, EnumMetadata>;
  InputMetadata: Record<string, TypeMetadata>;
  TypeMetadata: Record<string, TypeMetadata>;

  MethodMetadata: Record<string, MethodMetadata>;
  HttpRouteMetadata: Record<string, HttpRouteMetadata>;
  EventRouteMetadata: Record<string, EventRouteMetadata[]>;
}

// tslint:disable:variable-name
export abstract class Metadata implements MetadataRegistry {

  private static log: Logger = Logger.get('TYX', Metadata.name);
  private static validated: boolean = false;

  public static readonly DESIGN_TYPE = 'design:type';
  public static readonly DESIGN_PARAMS = 'design:paramtypes';
  public static readonly DESIGN_RETURN = 'design:returntype';

  public static readonly TYX_METADATA = 'tyx:metadata';
  public static readonly TYX_API = 'tyx:api';
  public static readonly TYX_SERVICE = 'tyx:service';
  public static readonly TYX_PROXY = 'tyx:proxy';
  public static readonly TYX_DATABASE = 'tyx:database';
  public static readonly TYX_TYPE = 'tyx:type';
  public static readonly TYX_ENUM = 'tyx:enum';
  public static readonly TYX_METHOD = 'tyx:method';
  public static readonly TYX_MEMBER = 'tyx:member';

  public static readonly TYX_ENTITY = 'tyx:entity';
  public static readonly TYX_COLUMN = 'tyx:column';
  public static readonly TYX_RELATION = 'tyx:relation';

  public static readonly RegistryMetadata: Record<string, TypeMetadata> = {};
  public static readonly DecoratorMetadata: Record<string, DecoratorMetadata> = {};
  public static readonly DecorationMetadata: DecorationMetadata[] = [];

  public static readonly ApiMetadata: Record<string, ApiMetadata> = {};
  public static readonly ServiceMetadata: Record<string, ServiceMetadata> = {};
  public static readonly ProxyMetadata: Record<string, ProxyMetadata> = {};

  public static readonly DatabaseMetadata: Record<string, DatabaseMetadata> = {};
  public static readonly EntityMetadata: Record<string, EntityMetadata> = {};
  public static readonly ColumnMetadata: Record<string, ColumnMetadata> = {};
  public static readonly RelationMetadata: Record<string, RelationMetadata> = {};

  public static readonly EnumMetadata: Record<string, EnumMetadata> = {};
  public static readonly InputMetadata: Record<string, TypeMetadata> = {};
  public static readonly TypeMetadata: Record<string, TypeMetadata> = {};

  public static readonly MethodMetadata: Record<string, MethodMetadata> = {};
  public static readonly HttpRouteMetadata: Record<string, HttpRouteMetadata> = {};
  public static readonly EventRouteMetadata: Record<string, EventRouteMetadata[]> = {};

  // ---

  public abstract RegistryMetadata: Record<string, TypeMetadata>;
  public abstract DecoratorMetadata: Record<string, DecoratorMetadata>;
  public abstract DecorationMetadata: DecorationMetadata[];

  public abstract ApiMetadata: Record<string, ApiMetadata>;
  public abstract ServiceMetadata: Record<string, ServiceMetadata>;
  public abstract ProxyMetadata: Record<string, ProxyMetadata>;

  public abstract DatabaseMetadata: Record<string, DatabaseMetadata>;
  public abstract EntityMetadata: Record<string, EntityMetadata>;
  public abstract ColumnMetadata: Record<string, ColumnMetadata>;
  public abstract RelationMetadata: Record<string, RelationMetadata>;

  public abstract EnumMetadata: Record<string, EnumMetadata>;
  public abstract InputMetadata: Record<string, TypeMetadata>;
  public abstract TypeMetadata: Record<string, TypeMetadata>;

  public abstract MethodMetadata: Record<string, MethodMetadata>;
  public abstract ResolverMetadata: Record<string, MethodMetadata>;
  public abstract HttpRouteMetadata: Record<string, HttpRouteMetadata>;
  public abstract EventRouteMetadata: Record<string, EventRouteMetadata[]>;

  private constructor() { }

  // private static regisry = new Registry();
  private static ordinal = 0;

  public static get(): Metadata {
    const reg: MetadataRegistry = {
      RegistryMetadata: this.RegistryMetadata,
      DecoratorMetadata: this.DecoratorMetadata,
      DecorationMetadata: this.DecorationMetadata,

      ApiMetadata: this.ApiMetadata,
      ServiceMetadata: this.ServiceMetadata,
      ProxyMetadata: this.ProxyMetadata,

      DatabaseMetadata: this.DatabaseMetadata,
      EntityMetadata: this.EntityMetadata,
      ColumnMetadata: this.ColumnMetadata,
      RelationMetadata: this.RelationMetadata,

      EnumMetadata: this.EnumMetadata,
      InputMetadata: this.InputMetadata,
      TypeMetadata: this.TypeMetadata,

      MethodMetadata: this.MethodMetadata,
      HttpRouteMetadata: this.HttpRouteMetadata,
      EventRouteMetadata: this.EventRouteMetadata,
    };
    Object.setPrototypeOf(reg, Metadata.prototype);
    return reg as any;
  }

  public static isValidated(): boolean {
    return this.validated;
  }

  public static validate(force?: boolean): MetadataRegistry {
    if (this.validated && !force) return this.get();

    const metadata: Record<string, TypeMetadata> = {};
    const entities: Record<string, TypeMetadata> = {};
    const inputs: Record<string, TypeMetadata> = {};
    const types: Record<string, TypeMetadata> = {};
    // Metadata
    for (const type of Object.values(this.RegistryMetadata)) {
      this.resolve(type, GraphKind.Metadata, metadata);
    }
    // Databases & Entities
    for (const db of Object.values(this.DatabaseMetadata)) {
      for (const type of Object.values(db.entities)) {
        this.resolve(type, GraphKind.Entity, entities);
      }
    }
    // Resolve unbound entites
    for (const type of Object.values(this.EntityMetadata)) {
      if (entities[type.name]) continue;
      this.log.warn(`Unbound entity type [${type.name}]`);
      this.resolve(type, GraphKind.Entity, entities);
    }
    // API
    for (const api of Object.values(this.ApiMetadata)) {
      for (const method of Object.values(api.methods)) {
        if (!method.query && !method.mutation && !method.resolver) continue;
        method.input.build = this.resolve(method.input, GraphKind.Input, inputs);
        method.result.build = this.resolve(method.result, GraphKind.Type, types);
      }
    }
    // TODO: Check for unused inputs and results
    // Inputs
    for (const type of Object.values(this.InputMetadata)) {
      this.resolve(type, GraphKind.Input, inputs);
    }
    // Results
    for (const type of Object.values(this.TypeMetadata)) {
      this.resolve(type, GraphKind.Type, types);
    }

    // TODO: Validate for no lose handler, methods, routes, events

    this.validated = true;
    return this.get();
  }

  private static resolve(metadata: VarMetadata, scope: GraphKind, reg: Record<string, TypeMetadata>): VarMetadata {
    if (GraphKind.isEnum(metadata.kind)) {
      const e = metadata as EnumMetadata;
      metadata.gql = e.name;
      metadata.js = e.name;
      metadata.idl = e.name;
      return metadata;
    }
    if (GraphKind.isScalar(metadata.kind)) {
      return VarMetadata.on({
        kind: metadata.kind,
        gql: metadata.kind,
        js: GraphKind.toJS(metadata.kind),
        idl: GraphKind.toIDL(metadata.kind)
      });
    }
    if (GraphKind.isArray(metadata.kind)) {
      const item = this.resolve(metadata.item, scope, reg);
      if (item) {
        return VarMetadata.on({
          kind: GraphKind.Array,
          item, gql: `[${item.gql}]`,
          js: `${item.js}[]`,
          idl: `${item.idl}`
        });
        // tslint:disable-next-line:no-else-after-return
      } else {
        return VarMetadata.on({
          kind: GraphKind.Array,
          item,
          gql: `[${GraphKind.Object}]`,
          js: `any[]`,
          idl: `${item.idl}`
        });
      }
    }
    if (GraphKind.isRef(metadata.kind)) {
      let type: VarMetadata = undefined;
      const target: any = metadata.ref();
      const ref = VarMetadata.of(target);
      if (GraphKind.isEnum(target && target.kind)) {
        type = this.resolve(target, scope, reg);
      } else if (GraphKind.isScalar(ref.kind)) {
        type = this.resolve(ref, scope, reg);
      } else if (GraphKind.isArray(ref.kind)) {
        const z = ref.item.ref;
        if (z) ref.item.ref = () => z;
        type = this.resolve(ref, scope, reg);
      } else if (GraphKind.isRef(ref.kind)) {
        // TODO: Make sure entity exists
        const entity = EntityMetadata.get(ref.ref);
        const meta = TypeMetadata.get(ref.ref);
        if (entity) {
          if (GraphKind.isInput(scope)) throw new TypeError(`Input type can not reference entity [${entity.name}]`);
          type = this.resolve(entity, scope, reg);
        } else if (meta) {
          type = this.resolve(meta, scope, reg);
        } else {
          type = VarMetadata.on({
            kind: GraphKind.Object,
            gql: GraphKind.Object,
            js: 'any',
            idl: '?ANY?'
          });
        }
      } else {
        throw Error('Internal registry error');
      }
      return type;
    }

    // if (GraphType.isEntity(target.type) && scope === GraphType.Result) {
    //     // TODO: Register imports
    //     return target.target.name;
    // }

    const struc = metadata as TypeMetadata;
    if (!GraphKind.isStruc(struc.kind)) {
      throw new TypeError('Internal metadata error');
    }
    const link = struc.target && struc.name;
    if (link && reg[link]) return reg[link];
    if (!struc.members || !Object.values(struc.members).length) {
      throw new TypeError(`Empty type difinition ${struc.target}`);
    }

    if (scope === GraphKind.Metadata && !GraphKind.isMetadata(metadata.kind)) {
      throw new TypeError(`Metadata type can not reference [${metadata.kind}]`);
    }
    if (scope === GraphKind.Input && !GraphKind.isInput(metadata.kind)) {
      throw new TypeError(`Input type can not reference [${metadata.kind}]`);
    }
    if (scope === GraphKind.Type && !GraphKind.isType(metadata.kind) && !GraphKind.isEntity(metadata.kind)) {
      throw new TypeError(`Type type can not reference [${metadata.kind}]`);
    }

    // Resolve structure
    struc.gql = struc.name;
    struc.js = struc.name;
    struc.idl = struc.name;
    reg[struc.name] = struc;
    for (const member of Object.values(struc.members)) {
      member.build = this.resolve(member, scope, reg);
    }
    return struc;
  }

  public static trace(
    decorator: string | Function,
    args: Record<string, any>,
    over: Object | Function,
    propertyKey?: string | symbol,
    index?: number,
  ) {
    const name = decorator instanceof Function ? decorator.name : decorator;
    const target = (typeof over === 'object' ? over.constructor : over);
    const key = propertyKey && propertyKey.toString();
    const traceInfo: DecorationMetadata = { decorator: name, ordinal: this.ordinal++, target, propertyKey: key, index, args };
    this.DecorationMetadata.push(traceInfo);

    const decoratorInfo = this.DecoratorMetadata[name] = this.DecoratorMetadata[name] || { decorator: name, count: 0, targets: {} };
    decoratorInfo.count++;
    decoratorInfo.targets[target.name] = target;
  }

  public stringify(ident?: number) {
    // TODO: Circular references
    function filter(key: string, value: any) {
      if (value instanceof Function) {
        if (Utils.isClass(value)) return `[class: ${value.name || 'inline'}]`;
        if (value.name) return `[function: ${value.name}]`;
        // TODO: is arrow function
        return `[ref: ${value.toString()}]`;
      }
      if (key.startsWith('inverse')) {
        if (value instanceof EntityMetadata || value instanceof RelationMetadata) return `#(${value.target.name})`;
      }
      return value;
    }
    return JSON.stringify(this, filter, ident);
  }
}
