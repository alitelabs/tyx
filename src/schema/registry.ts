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

  @Field(list => [TypeMetadataSchema]) RegistryMetadata: Record<string, TypeMetadata>;
  @Field(list => [DecoratorMetadataSchema]) DecoratorMetadata: Record<string, DecoratorMetadata>;
  @Field(list => [DecorationMetadataSchema]) DecorationMetadata: DecorationMetadata[];

  @Field(list => [ApiMetadataSchema]) ApiMetadata: Record<string, ApiMetadata>;
  @Field(list => [ServiceMetadataSchema]) ServiceMetadata: Record<string, ServiceMetadata>;
  @Field(list => [ProxyMetadataSchema]) ProxyMetadata: Record<string, ProxyMetadata>;

  @Field(list => [DatabaseMetadataSchema]) DatabaseMetadata: Record<string, DatabaseMetadata>;
  @Field(list => [EntityMetadataSchema]) EntityMetadata: Record<string, EntityMetadata>;
  @Field(list => [ColumnMetadataSchema]) ColumnMetadata: Record<string, ColumnMetadata>;
  @Field(list => [RelationMetadataSchema]) RelationMetadata: Record<string, RelationMetadata>;

  @Field(list => [EnumMetadataSchema]) EnumMetadata: Record<string, EnumMetadata>;
  @Field(list => [TypeMetadataSchema]) InputMetadata: Record<string, TypeMetadata>;
  @Field(list => [TypeMetadataSchema]) TypeMetadata: Record<string, TypeMetadata>;

  @Field(list => [MethodMetadataSchema]) MethodMetadata: Record<string, MethodMetadata>;
  @Field(list => [MethodMetadataSchema]) ResolverMetadata: Record<string, MethodMetadata>;
  @Field(list => [HttpRouteMetadataSchema]) HttpRouteMetadata: Record<string, HttpRouteMetadata>;
  @Field(list => [EventRouteMetadataSchema]) EventRouteMetadata: Record<string, EventRouteMetadata[]>;

  public static RESOLVERS: SchemaResolvers<MetadataRegistry> = {
    RegistryMetadata: (obj, args) => Lo.filter(Object.values(obj.RegistryMetadata), args),
    DecoratorMetadata: (obj, args) => Lo.filter(Object.values(obj.DecoratorMetadata), args),
    DecorationMetadata: (obj, args) => {
      if (args.target) args.target = `[class: ${args.target}]`;
      const mapped = obj.DecorationMetadata.map(meta => ({ ...meta, target: `[class: ${meta.target.name}]` }));
      return Lo.filter(mapped as any[], args);
    },
    ApiMetadata: (obj, args) => Lo.filter(Object.values(obj.ApiMetadata), args),
    ServiceMetadata: (obj, args) => Lo.filter(Object.values(obj.ServiceMetadata), args),
    ProxyMetadata: (obj, args) => Lo.filter(Object.values(obj.ProxyMetadata), args),
    DatabaseMetadata: (obj, args) => Lo.filter(Object.values(obj.DatabaseMetadata), args),
    EntityMetadata: (obj, args) => Lo.filter(Object.values(obj.EntityMetadata), args),
    ColumnMetadata: (obj, args) => Lo.filter(Object.values(obj.ColumnMetadata), args),
    RelationMetadata: (obj, args) => Lo.filter(Object.values(obj.RelationMetadata), args),
    EnumMetadata: (obj, args) => Lo.filter(Object.values(obj.EnumMetadata), args),
    InputMetadata: (obj, args) => Lo.filter(Object.values(obj.InputMetadata), args),
    TypeMetadata: (obj, args) => Lo.filter(Object.values(obj.TypeMetadata), args),
    MethodMetadata: (obj, args) => Lo.filter(Object.values(obj.MethodMetadata), args),
    HttpRouteMetadata: (obj, args) => Lo.filter(Object.values(obj.HttpRouteMetadata), args),
    EventRouteMetadata: (obj, args) => Lo.filter(Lo.concat([], ...Object.values(obj.EventRouteMetadata)), args),
  };
}
