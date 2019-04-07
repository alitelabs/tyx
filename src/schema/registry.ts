import { Schema } from '../decorators/schema';
import { Field } from '../decorators/type';
import { IApiMetadata } from '../metadata/api';
import { IColumnMetadata } from '../metadata/column';
import { IDatabaseMetadata } from '../metadata/database';
import { IEntityMetadata } from '../metadata/entity';
import { IEnumMetadata } from '../metadata/enum';
import { IEventRouteMetadata } from '../metadata/event';
import { IHttpRouteMetadata } from '../metadata/http';
import { IMethodMetadata } from '../metadata/method';
import { IProxyMetadata } from '../metadata/proxy';
import { IDecorationMetadata, IDecoratorMetadata, MetadataRegistry } from '../metadata/registry';
import { IRelationMetadata } from '../metadata/relation';
import { IServiceMetadata } from '../metadata/service';
import { ITypeMetadata, TypeMetadata } from '../metadata/type';
import { Class, SchemaResolvers, ServiceInfo } from '../types/core';
import { Utils } from '../utils';
import { ApiMetadataSchema } from './api';
import { ColumnMetadataSchema } from './column';
import { InstanceInfoSchema, ModuleInfoSchema, PackageInfoSchema, ProcessInfoSchema, ServiceInfoSchema } from './core';
import { DatabaseMetadataSchema } from './database';
import { EntityMetadataSchema } from './entity';
import { EventRouteMetadataSchema } from './event';
import { HttpRouteMetadataSchema } from './http';
import { MethodMetadataSchema } from './method';
import { ProxyMetadataSchema } from './proxy';
import { RelationMetadataSchema } from './relation';
import { ServiceMetadataSchema } from './service';
import { ArgMetadataSchema, EnumMetadataSchema, TypeMetadataSchema } from './type';

@Schema()
export class DecoratorMetadataSchema implements IDecoratorMetadata {
  @Field() decorator: string;
  @Field(0) count: number;
  @Field([String]) targets: Record<string, Class>;

  public static RESOLVERS: SchemaResolvers<IDecoratorMetadata> = {
    targets: obj => Object.values(obj.targets).map(t => Utils.label(t)),
  };
}

@Schema()
export class DecorationMetadataSchema implements IDecorationMetadata {
  @Field() decorator: string;
  @Field(0) ordinal: number;
  @Field(String) target?: Class;
  @Field() prototype?: boolean;
  @Field() propertyKey?: string;
  @Field(0) index?: number;
  @Field(Object) args: Record<string, any>;

  public static RESOLVERS: SchemaResolvers<IDecorationMetadata> = {
    target: obj => Utils.label(obj.target),
  };
}

// tslint:disable:variable-name
@Schema()
export class CoreSchema implements MetadataRegistry {

  @Field(list => [TypeMetadataSchema]) CoreMetadata: Record<string, ITypeMetadata>;
  @Field(list => [DecoratorMetadataSchema]) DecoratorMetadata: Record<string, IDecoratorMetadata>;
  @Field(list => [DecorationMetadataSchema]) DecorationMetadata: IDecorationMetadata[];

  @Field(list => [ApiMetadataSchema]) ApiMetadata: Record<string, IApiMetadata>;
  @Field(list => [ServiceMetadataSchema]) ServiceMetadata: Record<string, IServiceMetadata>;
  @Field(list => [ProxyMetadataSchema]) ProxyMetadata: Record<string, IProxyMetadata>;

  @Field(list => [DatabaseMetadataSchema]) DatabaseMetadata: Record<string, IDatabaseMetadata>;
  @Field(list => [EntityMetadataSchema]) EntityMetadata: Record<string, IEntityMetadata>;
  @Field(list => [ColumnMetadataSchema]) ColumnMetadata: Record<string, IColumnMetadata>;
  @Field(list => [RelationMetadataSchema]) RelationMetadata: Record<string, IRelationMetadata>;

  @Field(list => [EnumMetadataSchema]) EnumMetadata: Record<string, IEnumMetadata>;
  @Field(list => [ArgMetadataSchema]) InputMetadata: Record<string, ITypeMetadata>;
  @Field(list => [TypeMetadataSchema]) TypeMetadata: Record<string, ITypeMetadata>;

  @Field(list => [MethodMetadataSchema]) MethodMetadata: Record<string, IMethodMetadata>;
  @Field(list => [MethodMetadataSchema]) ResolverMetadata: Record<string, IMethodMetadata>;
  @Field(list => [HttpRouteMetadataSchema]) HttpRouteMetadata: Record<string, IHttpRouteMetadata>;
  @Field(list => [EventRouteMetadataSchema]) EventRouteMetadata: Record<string, IEventRouteMetadata[]>;

  // Additional runtime info

  @Field(ref => ProcessInfoSchema) Process: ProcessInfoSchema;
  @Field(list => [PackageInfoSchema]) Packages: PackageInfoSchema[];
  @Field(list => [ModuleInfoSchema]) Modules: ModuleInfoSchema[];
  @Field(list => [ServiceInfoSchema]) Global: ServiceInfoSchema[];
  @Field(list => [ServiceInfoSchema]) Context: ServiceInfoSchema[];
  @Field(list => [InstanceInfoSchema]) Pool: InstanceInfoSchema[];

  public static get metadata() { return TypeMetadata.get(CoreSchema); }

  public static RESOLVERS: SchemaResolvers<CoreSchema> = {
    CoreMetadata: (obj, args) => Utils.filter(obj.CoreMetadata, args),
    DecoratorMetadata: (obj, args) => Utils.filter(obj.DecoratorMetadata, args),
    DecorationMetadata: (obj, args) => {
      if (args.target) args.target = `[class: ${args.target}]`;
      const mapped = obj.DecorationMetadata.map(meta => ({ ...meta, target: `[class: ${meta.target.name}]` }));
      return Utils.filter(mapped as any[], args);
    },
    ApiMetadata: (obj, args) => Utils.filter(obj.ApiMetadata, args),
    ServiceMetadata: (obj, args) => Utils.filter(obj.ServiceMetadata, args),
    ProxyMetadata: (obj, args) => Utils.filter(obj.ProxyMetadata, args),
    DatabaseMetadata: (obj, args) => Utils.filter(obj.DatabaseMetadata, args),
    EntityMetadata: (obj, args) => Utils.filter(obj.EntityMetadata, args),
    ColumnMetadata: (obj, args) => Utils.filter(obj.ColumnMetadata, args),
    RelationMetadata: (obj, args) => Utils.filter(obj.RelationMetadata, args),
    EnumMetadata: (obj, args) => Utils.filter(obj.EnumMetadata, args),
    InputMetadata: (obj, args) => Utils.filter(obj.InputMetadata, args),
    TypeMetadata: (obj, args) => Utils.filter(obj.TypeMetadata, args),
    MethodMetadata: (obj, args) => Utils.filter(obj.MethodMetadata, args),
    HttpRouteMetadata: (obj, args) => Utils.filter(obj.HttpRouteMetadata, args),
    EventRouteMetadata: (obj, args) => Utils.filter(obj.EventRouteMetadata, args),
    // Runtime
    Process: (obj, args, ctx) => ctx.container.processInfo(),
    Packages: (obj, args, ctx) => Utils.filter(ctx.container.processInfo().packages, args),
    Modules: (obj, args, ctx) => Utils.filter(ctx.container.processInfo().modules, args),
    Global: (obj, args, ctx) => {
      const info = ctx.container.serviceInfo(true).map((s: ServiceInfo) => new ServiceInfoSchema(s));
      // TODO: Move to Utils.filter ....
      if (args.target) args.target = `[class: ${args.target}]`;
      if (args.type) args.type = `[class: ${args.type}]`;
      return Utils.filter(info, args);
    },
    Context: (obj, args, ctx) => {
      const info = ctx.container.serviceInfo().map((s: ServiceInfo) => new ServiceInfoSchema(s));
      if (args.target) args.target = `[class: ${args.target}]`;
      if (args.type) args.type = `[class: ${args.type}]`;
      return Utils.filter(info, args);
    },
    Pool: (obj, args, ctx) => {
      return (ctx.container.name === 'Core') ? ctx.container.instances() : undefined;
    }
  };
}
