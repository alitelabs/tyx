import { Logger } from '../logger';
import { Class } from '../types/core';
import * as Utils from '../utils/misc';
import { ApiMetadata, IApiMetadata } from './api';
import { ColumnMetadata, IColumnMetadata } from './column';
import { DatabaseMetadata, IDatabaseMetadata } from './database';
import { EntityMetadata, IEntityMetadata } from './entity';
import { EnumMetadata, IEnumMetadata } from './enum';
import { EventRouteMetadata, IEventRouteMetadata } from './event';
import { HttpRouteMetadata, IHttpRouteMetadata } from './http';
import { IMethodMetadata, MethodMetadata } from './method';
import { IProxyMetadata, ProxyMetadata } from './proxy';
import { IRelationMetadata, RelationMetadata } from './relation';
import { IServiceMetadata, ServiceMetadata } from './service';
import { ITypeMetadata, TypeMetadata } from './type';
import { VarKind, VarMetadata } from './var';

export type CoreDecorator = (
  over: Object | Function,
  propertyKey?: string,
  indexOrDescriptor?: number | PropertyDescriptor
) => void | Function;

export interface IDecorationMetadata {
  decorator: string;
  ordinal: number;
  target?: Class;
  prototype?: boolean;
  propertyKey?: string;
  index?: number;
  args: Record<string, any>;
}

export interface IDecoratorMetadata {
  decorator: string;
  count: number;
  targets: Record<string, Class>;
}

export interface MetadataRegistry {
  Registry: Record<string, ITypeMetadata>;
  Decorator: Record<string, IDecoratorMetadata>;
  Decoration: IDecorationMetadata[];

  Api: Record<string, IApiMetadata>;
  Service: Record<string, IServiceMetadata>;
  Proxy: Record<string, IProxyMetadata>;

  Database: Record<string, IDatabaseMetadata>;
  Entity: Record<string, IEntityMetadata>;
  Column: Record<string, IColumnMetadata>;
  Relation: Record<string, IRelationMetadata>;

  Enum: Record<string, IEnumMetadata>;
  Input: Record<string, ITypeMetadata>;
  Type: Record<string, ITypeMetadata>;

  Method: Record<string, IMethodMetadata>;
  HttpRoute: Record<string, IHttpRouteMetadata>;
  EventRoute: Record<string, IEventRouteMetadata[]>;

  resolve?(type: string, member: string, obj: any, args: any, ctx: any, info: any): any;
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
  public static readonly Decorator: Record<string, IDecoratorMetadata> = {};
  public static readonly Decoration: IDecorationMetadata[] = [];

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
  public abstract Decorator: Record<string, IDecoratorMetadata>;
  public abstract Decoration: IDecorationMetadata[];

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

  public static resolve(type: string, member: string, obj: any, args: any, ctx: any, info: any) {
    const meta: any = this.Registry[type];
    if (!meta || !meta.RESOLVERS || !meta.RESOLVERS[member]) return undefined;
    return meta.RESOLVERS[member](obj, args, ctx, info);
  }

  public resolve(type: string, member: string, obj: any, args: any, ctx: any, info: any) {
    const meta: any = this.Registry[type];
    if (!meta || !meta.RESOLVERS || !meta.RESOLVERS[member]) return undefined;
    return meta.RESOLVERS[member](obj, args, ctx, info);
  }

  public static isValidated(): boolean {
    return this.validated;
  }

  public static validate(force?: boolean): Metadata {
    if (this.validated && !force) return this.get();

    const metadata: Record<string, TypeMetadata> = {};
    const entities: Record<string, TypeMetadata> = {};
    const inputs: Record<string, TypeMetadata> = {};
    const types: Record<string, TypeMetadata> = {};
    // Metadata
    for (const type of Object.values(this.Registry)) {
      this.build(type, VarKind.Metadata, metadata);
    }
    // Databases & Entities
    for (const db of Object.values(this.Database)) {
      for (const type of Object.values(db.entities)) {
        this.build(type, VarKind.Entity, entities);
      }
    }
    // Resolve unbound entites
    for (const type of Object.values(this.Entity)) {
      if (entities[type.name]) continue;
      this.log.warn(`Unbound entity type [${type.name}]`);
      this.build(type, VarKind.Entity, entities);
    }
    // API
    for (const api of Object.values(this.Api)) {
      for (const method of Object.values(api.methods)) {
        if (!method.query && !method.mutation && !method.extension) continue;
        for (const input of method.inputs) {
          input.build = this.build(input, VarKind.Input, inputs);
        }
        method.result.build = this.build(method.result, VarKind.Type, types);
      }
    }
    // TODO: Check for unused inputs and results
    // Inputs
    for (const type of Object.values(this.Input)) {
      this.build(type, VarKind.Input, inputs);
    }
    // Results
    for (const type of Object.values(this.Type)) {
      this.build(type, VarKind.Type, types);
    }

    // TODO: Validate for no lose handler, methods, routes, events

    this.validated = true;
    return this.get();
  }

  private static build(metadata: VarMetadata, scope: VarKind, reg: Record<string, TypeMetadata>): VarMetadata {
    if (VarKind.isEnum(metadata.kind)) {
      const e = metadata as EnumMetadata;
      metadata.gql = e.name;
      metadata.js = e.name;
      metadata.idl = e.name;
      return metadata;
    }
    if (VarKind.isScalar(metadata.kind)) {
      return VarMetadata.on({
        kind: metadata.kind,
        gql: metadata.kind,
        js: VarKind.toJS(metadata.kind),
        idl: VarKind.toIDL(metadata.kind)
      });
    }
    if (VarKind.isResolver(metadata.kind)) {
      return VarMetadata.on({
        kind: metadata.kind,
        gql: metadata.kind,
        js: VarKind.toJS(metadata.kind),
        idl: VarKind.toIDL(metadata.kind)
      });
    }
    if (VarKind.isArray(metadata.kind)) {
      const item = this.build(metadata.item, scope, reg);
      if (item) {
        return VarMetadata.on({
          kind: VarKind.Array,
          item, gql: `[${item.gql}]`,
          js: `${item.js}[]`,
          idl: `list<${item.idl}>`
        });
        // tslint:disable-next-line:no-else-after-return
      } else {
        return VarMetadata.on({
          kind: VarKind.Array,
          item,
          gql: `[${VarKind.Object}]`,
          js: `any[]`,
          idl: `${item.idl}`
        });
      }
    }
    if (VarKind.isRef(metadata.kind)) {
      let type: VarMetadata = undefined;
      const target: any = metadata.ref();
      const ref = VarMetadata.of(target);
      if (VarKind.isEnum(target && target.kind)) {
        type = this.build(target, scope, reg);
      } else if (VarKind.isScalar(ref.kind)) {
        type = this.build(ref, scope, reg);
      } else if (VarKind.isArray(ref.kind)) {
        const z = ref.item.ref;
        if (z) ref.item.ref = () => z;
        type = this.build(ref, scope, reg);
      } else if (VarKind.isRef(ref.kind)) {
        // TODO: Make sure entity exists
        const entity = EntityMetadata.get(ref.ref);
        const meta = TypeMetadata.get(ref.ref);
        if (entity) {
          if (VarKind.isInput(scope)) throw new TypeError(`Input type can not reference entity [${entity.name}]`);
          type = this.build(entity, scope, reg);
        } else if (meta) {
          type = this.build(meta, scope, reg);
        } else {
          type = VarMetadata.on({
            kind: VarKind.Object,
            gql: VarKind.Object,
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
    if (!VarKind.isStruc(struc.kind)) {
      throw new TypeError('Internal metadata error');
    }
    const link = struc.target && struc.name;
    if (link && reg[link]) return reg[link];
    if (!struc.members || !Object.values(struc.members).length) {
      throw new TypeError(`Empty type difinition ${struc.target}`);
    }

    if (scope === VarKind.Metadata && !VarKind.isMetadata(metadata.kind)) {
      throw new TypeError(`Metadata type can not reference [${metadata.kind}]`);
    }
    if (scope === VarKind.Input && !VarKind.isInput(metadata.kind)) {
      throw new TypeError(`Input type can not reference [${metadata.kind}]`);
    }
    if (scope === VarKind.Type && !VarKind.isType(metadata.kind) && !VarKind.isEntity(metadata.kind)) {
      throw new TypeError(`Type type can not reference [${metadata.kind}]`);
    }

    // Resolve structure
    struc.gql = struc.name;
    struc.js = struc.name;
    struc.idl = struc.name;
    reg[struc.name] = struc;
    for (const member of Object.values(struc.members)) {
      member.build = this.build(member, scope, reg);
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
    const traceInfo: IDecorationMetadata = {
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
