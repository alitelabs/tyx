import { Class } from '../types/core';
import * as Utils from '../utils/misc';
import { ApiMetadata, IApiMetadata } from './api';
import { ColumnMetadata, IColumnMetadata } from './column';
import { DatabaseMetadata, IDatabaseMetadata } from './database';
import { EntityMetadata, IEntityMetadata } from './entity';
import { EventRouteMetadata, HttpRouteMetadata, IMethodMetadata, MethodMetadata } from './method';
import { IProxyMetadata, ProxyMetadata } from './proxy';
import { IRelationMetadata, RelationMetadata } from './relation';
import { IServiceMetadata, ServiceMetadata } from './service';
import { EnumMetadata, GraphKind, ITypeMetadata, TypeMetadata, VarMetadata } from './type';

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
  RegistryMetadata: Record<string, ITypeMetadata>;
  DecoratorMetadata: Record<string, DecoratorMetadata>;
  DecorationMetadata: DecorationMetadata[];

  ApiMetadata: Record<string, IApiMetadata>;
  ServiceMetadata: Record<string, IServiceMetadata>;
  ProxyMetadata: Record<string, IProxyMetadata>;

  DatabaseMetadata: Record<string, IDatabaseMetadata>;
  EntityMetadata: Record<string, IEntityMetadata>;
  ColumnMetadata: Record<string, IColumnMetadata>;
  RelationMetadata: Record<string, IRelationMetadata>;

  EnumMetadata: Record<string, EnumMetadata>;
  InputMetadata: Record<string, ITypeMetadata>;
  TypeMetadata: Record<string, ITypeMetadata>;

  MethodMetadata: Record<string, IMethodMetadata>;
  HttpRouteMetadata: Record<string, HttpRouteMetadata>;
  EventRouteMetadata: Record<string, EventRouteMetadata[]>;
}

// tslint:disable:variable-name
export abstract class Registry implements MetadataRegistry {
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

  public static get(): Registry {
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
    Object.setPrototypeOf(reg, Registry.prototype);
    return reg as any;
  }

  public static validate() {
    const metadata: Record<string, TypeMetadata> = {};
    const entities: Record<string, TypeMetadata> = {};
    const inputs: Record<string, TypeMetadata> = {};
    const types: Record<string, TypeMetadata> = {};
    // Metadata
    for (const type of Object.values(this.RegistryMetadata)) {
      this.resolve(type, GraphKind.Metadata, metadata);
    }
    // Entities
    for (const type of Object.values(this.EntityMetadata)) {
      this.resolve(type, GraphKind.Entity, entities);
    }
    // API
    for (const api of Object.values(this.ApiMetadata)) {
      for (const method of Object.values(api.methods)) {
        if (!method.query && !method.mutation && !method.resolver) continue;
        method.input.type = this.resolve(method.input, GraphKind.Input, inputs);
        method.result.type = this.resolve(method.result, GraphKind.Type, types);
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
  }

  private static resolve(metadata: VarMetadata, scope: GraphKind, reg: Record<string, TypeMetadata>): VarMetadata {
    if (GraphKind.isScalar(metadata.kind)) {
      return { kind: metadata.kind, def: metadata.kind, js: GraphKind.toJS(metadata.kind) };
    }
    if (GraphKind.isEnum(metadata.kind)) {
      const e = metadata as EnumMetadata;
      metadata.def = e.name;
      metadata.js = e.name;
      return metadata;
    }
    if (GraphKind.isArray(metadata.kind)) {
      const item = this.resolve(metadata.item, scope, reg);
      if (item) return { kind: GraphKind.Array, item, def: `[${item.def}]`, js: `${item.js}[]` };
      return { kind: GraphKind.Array, item, def: `[${GraphKind.Object}]`, js: `any[]` };
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
        ref.item.ref = z && (() => z);
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
          type = { kind: GraphKind.Object, def: GraphKind.Object, js: 'any' };
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
    struc.def = struc.name;
    struc.js = struc.name;
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
