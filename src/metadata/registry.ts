import { Logger } from '../logger';
import { Class } from '../types/core';
import * as Utils from '../utils/misc';
import { ApiMetadata } from './api';
import { ColumnMetadata } from './column';
import { DatabaseMetadata } from './database';
import { EntityMetadata } from './entity';
import { EventRouteMetadata } from './event';
import { HttpRouteMetadata } from './http';
import { MethodMetadata } from './method';
import { ProxyMetadata } from './proxy';
import { RelationMetadata } from './relation';
import { ServiceMetadata } from './service';
import { EnumMetadata, GraphKind, TypeMetadata, VarMetadata } from './type';

export type CoreDecorator = (
  over: Object | Function,
  propertyKey?: string,
  indexOrDescriptor?: number | PropertyDescriptor
) => void | Function;

export interface DecorationMetadata {
  decorator: string;
  ordinal: number;
  target?: Class;
  prototype?: boolean;
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
  Registry: Record<string, TypeMetadata>;
  Decorator: Record<string, DecoratorMetadata>;
  Decoration: DecorationMetadata[];

  Api: Record<string, ApiMetadata>;
  Service: Record<string, ServiceMetadata>;
  Proxy: Record<string, ProxyMetadata>;

  Database: Record<string, DatabaseMetadata>;
  Entity: Record<string, EntityMetadata>;
  Column: Record<string, ColumnMetadata>;
  Relation: Record<string, RelationMetadata>;

  Enum: Record<string, EnumMetadata>;
  Input: Record<string, TypeMetadata>;
  Type: Record<string, TypeMetadata>;

  Method: Record<string, MethodMetadata>;
  HttpRoute: Record<string, HttpRouteMetadata>;
  EventRoute: Record<string, EventRouteMetadata[]>;
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

  public static readonly Registry: Record<string, TypeMetadata> = {};
  public static readonly Decorator: Record<string, DecoratorMetadata> = {};
  public static readonly Decoration: DecorationMetadata[] = [];

  public static readonly Api: Record<string, ApiMetadata> = {};
  public static readonly Service: Record<string, ServiceMetadata> = {};
  public static readonly Proxy: Record<string, ProxyMetadata> = {};

  public static readonly Database: Record<string, DatabaseMetadata> = {};
  public static readonly Entity: Record<string, EntityMetadata> = {};
  public static readonly Column: Record<string, ColumnMetadata> = {};
  public static readonly Relation: Record<string, RelationMetadata> = {};

  public static readonly Enum: Record<string, EnumMetadata> = {};
  public static readonly Input: Record<string, TypeMetadata> = {};
  public static readonly Type: Record<string, TypeMetadata> = {};

  public static readonly Method: Record<string, MethodMetadata> = {};
  public static readonly HttpRoute: Record<string, HttpRouteMetadata> = {};
  public static readonly EventRoute: Record<string, EventRouteMetadata[]> = {};

  // ---

  public abstract Registry: Record<string, TypeMetadata>;
  public abstract Decorator: Record<string, DecoratorMetadata>;
  public abstract Decoration: DecorationMetadata[];

  public abstract Api: Record<string, ApiMetadata>;
  public abstract Service: Record<string, ServiceMetadata>;
  public abstract Proxy: Record<string, ProxyMetadata>;

  public abstract Database: Record<string, DatabaseMetadata>;
  public abstract Entity: Record<string, EntityMetadata>;
  public abstract Column: Record<string, ColumnMetadata>;
  public abstract Relation: Record<string, RelationMetadata>;

  public abstract Enum: Record<string, EnumMetadata>;
  public abstract Input: Record<string, TypeMetadata>;
  public abstract Type: Record<string, TypeMetadata>;

  public abstract Method: Record<string, MethodMetadata>;
  public abstract ResolverMetadata: Record<string, MethodMetadata>;
  public abstract HttpRoute: Record<string, HttpRouteMetadata>;
  public abstract EventRoute: Record<string, EventRouteMetadata[]>;

  private constructor() { }

  // private static regisry = new Registry();
  private static ordinal = 0;

  public static get(): Metadata {
    const reg: MetadataRegistry = {
      Registry: this.Registry,
      Decorator: this.Decorator,
      Decoration: this.Decoration,

      Api: this.Api,
      Service: this.Service,
      Proxy: this.Proxy,

      Database: this.Database,
      Entity: this.Entity,
      Column: this.Column,
      Relation: this.Relation,

      Enum: this.Enum,
      Input: this.Input,
      Type: this.Type,

      Method: this.Method,
      HttpRoute: this.HttpRoute,
      EventRoute: this.EventRoute
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
    for (const type of Object.values(this.Registry)) {
      this.resolve(type, GraphKind.Metadata, metadata);
    }
    // Databases & Entities
    for (const db of Object.values(this.Database)) {
      for (const type of Object.values(db.entities)) {
        this.resolve(type, GraphKind.Entity, entities);
      }
    }
    // Resolve unbound entites
    for (const type of Object.values(this.Entity)) {
      if (entities[type.name]) continue;
      this.log.warn(`Unbound entity type [${type.name}]`);
      this.resolve(type, GraphKind.Entity, entities);
    }
    // API
    for (const api of Object.values(this.Api)) {
      for (const method of Object.values(api.methods)) {
        if (!method.query && !method.mutation && !method.resolver) continue;
        method.input.build = this.resolve(method.input, GraphKind.Input, inputs);
        method.result.build = this.resolve(method.result, GraphKind.Type, types);
      }
    }
    // TODO: Check for unused inputs and results
    // Inputs
    for (const type of Object.values(this.Input)) {
      this.resolve(type, GraphKind.Input, inputs);
    }
    // Results
    for (const type of Object.values(this.Type)) {
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

  // ClassDecorator = <TFunction extends Function>(target: TFunction) => TFunction | void;
  // PropertyDecorator = (target: Object, propertyKey: string | symbol) => void;
  // MethodDecorator = <T>(target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<T>)
  // => TypedPropertyDescriptor<T> | void;
  // ParameterDecorator = (target: Object, propertyKey: string | symbol, parameterIndex: number) => void;

  public static onClass(
    decorator: Function,
    args: Record<string, any>,
    executor: ClassDecorator
  ): ClassDecorator {
    return (target) => {
      this.trace(decorator, args, target, undefined, undefined);
      return executor(target);
    };
  }

  public static onProperty(
    decorator: Function,
    args: Record<string, any>,
    executor: PropertyDecorator
  ): PropertyDecorator {
    return (target, propertyKey) => {
      if (typeof propertyKey !== 'string') throw new TypeError('propertyKey must be string');
      this.trace(decorator, args, target, propertyKey, undefined);
      return executor(target, propertyKey);
    };
  }

  public static onClassOrProperty(
    decorator: Function,
    args: Record<string, any>,
    executor: (target: Object | Class, propertyKey?: string) => ClassDecorator | PropertyDecorator
  ): ClassDecorator | PropertyDecorator {
    return (target, propertyKey) => {
      if (propertyKey && typeof propertyKey !== 'string') throw new TypeError('propertyKey must be string');
      this.trace(decorator, args, target, propertyKey, undefined);
      return executor(target, propertyKey as string);
    };
  }

  public static onMethod(
    decorator: Function,
    args: Record<string, any>,
    executor: MethodDecorator
  ): MethodDecorator {
    return (target, propertyKey, descriptor) => {
      if (typeof propertyKey !== 'string') throw new TypeError('propertyKey must be string');
      this.trace(decorator, args, target, propertyKey, undefined);
      return executor(target, propertyKey, descriptor);
    };
  }

  public static onParameter(
    decorator: Function,
    args: Record<string, any>,
    executor: ParameterDecorator
  ): ParameterDecorator {
    return (target, propertyKey, index) => {
      if (typeof propertyKey !== 'string') throw new TypeError('propertyKey must be string');
      this.trace(decorator, args, target, propertyKey, index);
      return executor(target, propertyKey, index);
    };
  }

  public static trace(
    decorator: Function,
    args: Record<string, any>,
    over: Object | Function,
    propertyKey: string | symbol,
    index: number
  ): void {
    const name = decorator instanceof Function ? decorator.name : decorator;
    const target = (typeof over === 'object' ? over.constructor : over);
    const key = propertyKey && propertyKey.toString();
    const traceInfo: DecorationMetadata = {
      decorator: name,
      ordinal: this.ordinal,
      target, prototype: target !== over,
      propertyKey: key,
      index,
      args
    };
    this.Decoration.push(traceInfo);

    const decoratorInfo = this.Decorator[name] = this.Decorator[name] || { decorator: name, count: 0, targets: {} };
    decoratorInfo.count++;
    decoratorInfo.targets[target.name] = target;

    // let res: any;
    // if ((decorator as any).core || target.name.startsWith('Core')) {
    //   res = executor();
    // } else {
    //   // TODO: Lazy decorator execution
    //   res = true && executor();
    // }

    false && console.log(
      `-- [${this.ordinal}] @${decorator.name} ${target.name}`
      + (key ? `.${key}` : ''),
      index !== undefined ? `(${index})` : ''
    );

    this.ordinal++;
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
