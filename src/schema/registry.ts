// tslint:disable-next-line:import-name
import Lo = require('lodash');
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
import { ITypeMetadata } from '../metadata/type';
import { Class, SchemaResolvers } from '../types/core';
import { Utils } from '../utils';
import { ApiMetadataSchema } from './api';
import { ColumnMetadataSchema } from './column';
import { CoreInfoSchema } from './core';
import { DatabaseMetadataSchema } from './database';
import { EntityMetadataSchema } from './entity';
import { EventRouteMetadataSchema } from './event';
import { HttpRouteMetadataSchema } from './http';
import { MethodMetadataSchema } from './method';
import { ProxyMetadataSchema } from './proxy';
import { RelationMetadataSchema } from './relation';
import { ServiceMetadataSchema } from './service';
import { EnumMetadataSchema, TypeMetadataSchema } from './type';

// Keep
CoreInfoSchema.name;

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
export class MetadataRegistrySchema implements MetadataRegistry {

  @Field(list => [TypeMetadataSchema]) Registry: Record<string, ITypeMetadata>;
  @Field(list => [DecoratorMetadataSchema]) Decorator: Record<string, IDecoratorMetadata>;
  @Field(list => [DecorationMetadataSchema]) Decoration: IDecorationMetadata[];

  @Field(list => [ApiMetadataSchema]) Api: Record<string, IApiMetadata>;
  @Field(list => [ServiceMetadataSchema]) Service: Record<string, IServiceMetadata>;
  @Field(list => [ProxyMetadataSchema]) Proxy: Record<string, IProxyMetadata>;

  @Field(list => [DatabaseMetadataSchema]) Database: Record<string, IDatabaseMetadata>;
  @Field(list => [EntityMetadataSchema]) Entity: Record<string, IEntityMetadata>;
  @Field(list => [ColumnMetadataSchema]) Column: Record<string, IColumnMetadata>;
  @Field(list => [RelationMetadataSchema]) Relation: Record<string, IRelationMetadata>;

  @Field(list => [EnumMetadataSchema]) Enum: Record<string, IEnumMetadata>;
  @Field(list => [TypeMetadataSchema]) Input: Record<string, ITypeMetadata>;
  @Field(list => [TypeMetadataSchema]) Type: Record<string, ITypeMetadata>;

  @Field(list => [MethodMetadataSchema]) Method: Record<string, IMethodMetadata>;
  @Field(list => [MethodMetadataSchema]) ResolverMetadata: Record<string, IMethodMetadata>;
  @Field(list => [HttpRouteMetadataSchema]) HttpRoute: Record<string, IHttpRouteMetadata>;
  @Field(list => [EventRouteMetadataSchema]) EventRoute: Record<string, IEventRouteMetadata[]>;

  public static RESOLVERS: SchemaResolvers<MetadataRegistry> = {
    Registry: (obj, args) => Lo.filter(Object.values(obj.Registry), args),
    Decorator: (obj, args) => Lo.filter(Object.values(obj.Decorator), args),
    Decoration: (obj, args) => {
      if (args.target) args.target = `[class: ${args.target}]`;
      const mapped = obj.Decoration.map(meta => ({ ...meta, target: `[class: ${meta.target.name}]` }));
      return Lo.filter(mapped as any[], args);
    },
    Api: (obj, args) => Lo.filter(Object.values(obj.Api), args),
    Service: (obj, args) => Lo.filter(Object.values(obj.Service), args),
    Proxy: (obj, args) => Lo.filter(Object.values(obj.Proxy), args),
    Database: (obj, args) => Lo.filter(Object.values(obj.Database), args),
    Entity: (obj, args) => Lo.filter(Object.values(obj.Entity), args),
    Column: (obj, args) => Lo.filter(Object.values(obj.Column), args),
    Relation: (obj, args) => Lo.filter(Object.values(obj.Relation), args),
    Enum: (obj, args) => Lo.filter(Object.values(obj.Enum), args),
    Input: (obj, args) => Lo.filter(Object.values(obj.Input), args),
    Type: (obj, args) => Lo.filter(Object.values(obj.Type), args),
    Method: (obj, args) => Lo.filter(Object.values(obj.Method), args),
    HttpRoute: (obj, args) => Lo.filter(Object.values(obj.HttpRoute), args),
    EventRoute: (obj, args) => Lo.filter(Lo.concat([], ...Object.values(obj.EventRoute)), args),
  };
}
