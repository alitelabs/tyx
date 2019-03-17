// tslint:disable-next-line:import-name
import Lo = require('lodash');
import { Schema } from '../decorators/schema';
import { Field } from '../decorators/type';
import { SchemaResolvers } from '../graphql/types';
import { ApiMetadata } from '../metadata/api';
import { ColumnMetadata } from '../metadata/column';
import { DatabaseMetadata } from '../metadata/database';
import { EntityMetadata } from '../metadata/entity';
import { EventRouteMetadata } from '../metadata/event';
import { HttpRouteMetadata } from '../metadata/http';
import { MethodMetadata } from '../metadata/method';
import { ProxyMetadata } from '../metadata/proxy';
import { DecorationMetadata, DecoratorMetadata, MetadataRegistry } from '../metadata/registry';
import { RelationMetadata } from '../metadata/relation';
import { ServiceMetadata } from '../metadata/service';
import { EnumMetadata, TypeMetadata } from '../metadata/type';
import { Class } from '../types/core';
import { Utils } from '../utils';
import { ApiMetadataSchema } from './api';
import { ColumnMetadataSchema } from './column';
import { DatabaseMetadataSchema } from './database';
import { EntityMetadataSchema } from './entity';
import { EventRouteMetadataSchema } from './event';
import { HttpRouteMetadataSchema } from './http';
import { MethodMetadataSchema } from './method';
import { ProxyMetadataSchema } from './proxy';
import { RelationMetadataSchema } from './relation';
import { ServiceMetadataSchema } from './service';
import { EnumMetadataSchema, TypeMetadataSchema } from './type';

@Schema()
export class DecoratorMetadataSchema implements DecoratorMetadata {
  @Field() decorator: string;
  @Field(0) count: number;
  @Field([String]) targets: Record<string, Class>;

  public static RESOLVERS: SchemaResolvers<DecoratorMetadata> = {
    targets: obj => Object.values(obj.targets).map(t => Utils.label(t)),
  };
}

@Schema()
export class DecorationMetadataSchema implements DecorationMetadata {
  @Field() decorator: string;
  @Field(0) ordinal: number;
  @Field(String) target?: Class;
  @Field() prototype?: boolean;
  @Field() propertyKey?: string;
  @Field(0) index?: number;
  @Field(Object) args: Record<string, any>;

  public static RESOLVERS: SchemaResolvers<DecorationMetadata> = {
    target: obj => Utils.label(obj.target),
  };
}

// tslint:disable:variable-name
@Schema()
export class MetadataRegistrySchema implements MetadataRegistry {

  @Field(list => [TypeMetadataSchema]) Registry: Record<string, TypeMetadata>;
  @Field(list => [DecoratorMetadataSchema]) Decorator: Record<string, DecoratorMetadata>;
  @Field(list => [DecorationMetadataSchema]) Decoration: DecorationMetadata[];

  @Field(list => [ApiMetadataSchema]) Api: Record<string, ApiMetadata>;
  @Field(list => [ServiceMetadataSchema]) Service: Record<string, ServiceMetadata>;
  @Field(list => [ProxyMetadataSchema]) Proxy: Record<string, ProxyMetadata>;

  @Field(list => [DatabaseMetadataSchema]) Database: Record<string, DatabaseMetadata>;
  @Field(list => [EntityMetadataSchema]) Entity: Record<string, EntityMetadata>;
  @Field(list => [ColumnMetadataSchema]) Column: Record<string, ColumnMetadata>;
  @Field(list => [RelationMetadataSchema]) Relation: Record<string, RelationMetadata>;

  @Field(list => [EnumMetadataSchema]) Enum: Record<string, EnumMetadata>;
  @Field(list => [TypeMetadataSchema]) Input: Record<string, TypeMetadata>;
  @Field(list => [TypeMetadataSchema]) Type: Record<string, TypeMetadata>;

  @Field(list => [MethodMetadataSchema]) Method: Record<string, MethodMetadata>;
  @Field(list => [MethodMetadataSchema]) ResolverMetadata: Record<string, MethodMetadata>;
  @Field(list => [HttpRouteMetadataSchema]) HttpRoute: Record<string, HttpRouteMetadata>;
  @Field(list => [EventRouteMetadataSchema]) EventRoute: Record<string, EventRouteMetadata[]>;

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
