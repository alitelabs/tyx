import { Logger } from '../logger';
import { Class } from '../types/core';
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
import { VarKind, VarMetadata, VarResolution } from './var';

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
  CoreMetadata: Record<string, ITypeMetadata>;
  DecoratorMetadata: Record<string, IDecoratorMetadata>;
  DecorationMetadata: IDecorationMetadata[];

  ApiMetadata: Record<string, IApiMetadata>;
  ServiceMetadata: Record<string, IServiceMetadata>;
  ProxyMetadata: Record<string, IProxyMetadata>;

  DatabaseMetadata: Record<string, IDatabaseMetadata>;
  EntityMetadata: Record<string, IEntityMetadata>;
  ColumnMetadata: Record<string, IColumnMetadata>;
  RelationMetadata: Record<string, IRelationMetadata>;

  EnumMetadata: Record<string, IEnumMetadata>;
  InputMetadata: Record<string, ITypeMetadata>;
  TypeMetadata: Record<string, ITypeMetadata>;

  MethodMetadata: Record<string, IMethodMetadata>;
  HttpRouteMetadata: Record<string, IHttpRouteMetadata>;
  EventRouteMetadata: Record<string, IEventRouteMetadata[]>;

  resolve?(target: string, obj: any, args: any, ctx: any, info: any): any;
}

export namespace MetadataRegistry {
  export const DESIGN_TYPE = 'design:type';
  export const DESIGN_PARAMS = 'design:paramtypes';
  export const DESIGN_RETURN = 'design:returntype';

  export const TYX_METADATA = 'tyx:metadata';
  export const TYX_API = 'tyx:api';
  export const TYX_SERVICE = 'tyx:service';
  export const TYX_PROXY = 'tyx:proxy';
  export const TYX_DATABASE = 'tyx:database';
  export const TYX_TYPE = 'tyx:type';
  export const TYX_ENUM = 'tyx:enum';
  export const TYX_METHOD = 'tyx:method';
  export const TYX_MEMBER = 'tyx:member';

  export const TYX_ENTITY = 'tyx:entity';
  export const TYX_COLUMN = 'tyx:column';
  export const TYX_RELATION = 'tyx:relation';
}

const validated = Symbol('validated');

// tslint:disable:variable-name
export abstract class Registry implements MetadataRegistry {

  public static log: Logger = Logger.get('TYX', Registry.name);

  public static readonly CoreMetadata: Record<string, TypeMetadata> = {};
  public static readonly DecoratorMetadata: Record<string, IDecoratorMetadata> = {};
  public static readonly DecorationMetadata: IDecorationMetadata[] = [];

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

  public CoreMetadata: Record<string, TypeMetadata>;
  public DecoratorMetadata: Record<string, IDecoratorMetadata>;
  public DecorationMetadata: IDecorationMetadata[];

  public ApiMetadata: Record<string, ApiMetadata>;
  public ServiceMetadata: Record<string, ServiceMetadata>;
  public ProxyMetadata: Record<string, ProxyMetadata>;

  public DatabaseMetadata: Record<string, DatabaseMetadata>;
  public EntityMetadata: Record<string, EntityMetadata>;
  public ColumnMetadata: Record<string, ColumnMetadata>;
  public RelationMetadata: Record<string, RelationMetadata>;

  public EnumMetadata: Record<string, EnumMetadata>;
  public InputMetadata: Record<string, TypeMetadata>;
  public TypeMetadata: Record<string, TypeMetadata>;

  public MethodMetadata: Record<string, MethodMetadata>;
  public ResolverMetadata: Record<string, MethodMetadata>;
  public HttpRouteMetadata: Record<string, HttpRouteMetadata>;
  public EventRouteMetadata: Record<string, EventRouteMetadata[]>;

  protected constructor() {
    throw TypeError('Abstract class');
  }

  public static copy(): Registry {
    const reg: MetadataRegistry = {
      CoreMetadata: this.CoreMetadata,
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
      EventRouteMetadata: this.EventRouteMetadata
    };
    Object.setPrototypeOf(reg, Registry.prototype);
    return reg as any;
  }

  public static isValidated(): boolean {
    return !!(this as any)[validated];
  }

  public static validate(force?: boolean): Registry {
    if (this.isValidated() && !force) return this.copy();

    const metadata: Record<string, TypeMetadata> = {};
    const entities: Record<string, TypeMetadata> = {};
    const inputs: Record<string, TypeMetadata> = {};
    const types: Record<string, TypeMetadata> = {};
    // Metadata
    for (const type of Object.values(this.CoreMetadata)) {
      this.build(type, VarKind.Metadata, metadata);
    }
    // Databases & Entities
    for (const db of Object.values(this.DatabaseMetadata)) {
      for (const type of Object.values(db.entities)) {
        this.build(type, VarKind.Entity, entities);
      }
    }
    // Resolve unbound entites
    for (const type of Object.values(this.EntityMetadata)) {
      if (entities[type.name]) continue;
      this.log.warn(`Unbound entity type [${type.name}]`);
      this.build(type, VarKind.Entity, entities);
    }
    // API
    for (const api of Object.values(this.ApiMetadata)) {
      for (const method of Object.values(api.methods)) {
        if (!method.query && !method.mutation && !method.extension) continue;
        for (const input of method.args) {
          input.res = this.build(input, VarKind.Input, inputs);
        }
        method.result.res = this.build(method.result, VarKind.Type, types);
      }
    }
    // TODO: Check for unused inputs and results
    // Inputs
    for (const type of Object.values(this.InputMetadata)) {
      this.build(type, VarKind.Input, inputs);
    }
    // Results
    for (const type of Object.values(this.TypeMetadata)) {
      this.build(type, VarKind.Type, types);
    }

    // TODO: Validate for no lose handler, methods, routes, events

    (this as any)[validated] = true;
    return this.copy();
  }

  public static build(target: VarMetadata, scope: VarKind, reg: Record<string, TypeMetadata>): VarResolution {
    if (VarKind.isEnum(target.kind)) {
      return VarResolution.of(target);
    }
    if (VarKind.isScalar(target.kind)) {
      return VarResolution.of(target);
    }
    if (VarKind.isResolver(target.kind)) {
      return VarResolution.of(target);
    }
    if (VarKind.isArray(target.kind)) {
      const item = this.build(target.item, scope, reg);
      return VarResolution.of(target, item);
    }
    if (VarKind.isRef(target.kind)) {
      let type: VarResolution = undefined;
      const tg: any = target.ref();
      const ref = VarMetadata.of(tg);
      if (VarKind.isEnum(tg && tg.kind)) {
        type = this.build(tg, scope, reg);
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
          type = VarResolution.of(null);
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

    const struc = target as TypeMetadata;
    if (!VarKind.isStruc(struc.kind)) {
      throw new TypeError('Internal metadata error');
    }
    const link = struc.target && struc.name;
    if (link && reg[link]) return reg[link].res;
    if (!struc.members || !Object.values(struc.members).length) {
      throw new TypeError(`Empty type difinition ${struc.target}`);
    }

    if (scope === VarKind.Metadata && !VarKind.isMetadata(target.kind)) {
      throw new TypeError(`Metadata type can not reference [${target.kind}]`);
    }
    if (scope === VarKind.Input && !VarKind.isInput(target.kind)) {
      throw new TypeError(`Input type can not reference [${target.kind}]`);
    }
    if (scope === VarKind.Type && !VarKind.isType(target.kind) && !VarKind.isEntity(target.kind)) {
      throw new TypeError(`Type type can not reference [${target.kind}]`);
    }
    // Resolve structure
    struc.res = VarResolution.of(struc);
    reg[struc.name] = struc;
    for (const member of Object.values(struc.members)) {
      member.res = this.build(member, scope, reg);
    }
    return struc.res;
  }

  // public stringify(ident?: number) {
  //   // TODO: Circular references
  //   function filter(key: string, value: any) {
  //     if (value instanceof Function) {
  //       if (Utils.isClass(value)) return `[class: ${value.name || 'inline'}]`;
  //       if (value.name) return `[function: ${value.name}]`;
  //       // TODO: is arrow function
  //       return `[ref: ${value.toString()}]`;
  //     }
  //     if (key.startsWith('inverse')) {
  //       if (value instanceof EntityMetadata || value instanceof RelationMetadata) return `#(${value.target.name})`;
  //     }
  //     return value;
  //   }
  //   return JSON.stringify(this, filter, ident);
  // }
}

export interface CoreDecorator {
  (
    over: Object | Function,
    propertyKey?: string,
    indexOrDescriptor?: number | PropertyDescriptor
  ): void | Function;
}

export abstract class CoreDecorator {

  private static ordinal: number = 0;

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
    Registry.DecorationMetadata.push(traceInfo);

    const decoratorInfo = Registry.DecoratorMetadata[name] = Registry.DecoratorMetadata[name] || { decorator: name, count: 0, targets: {} };
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
}
