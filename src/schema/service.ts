// tslint:disable-next-line:import-name
import Lo = require('lodash');
import { Schema } from '../decorators/schema';
import { Field } from '../decorators/type';
import { SchemaResolvers } from '../graphql/types';
import { IApiMetadata } from '../metadata/api';
import { IHandlerMetadata, IInjectMetadata, IServiceMetadata } from '../metadata/service';
import { Class } from '../types/core';
import { Utils } from '../utils';
import { ApiMetadataSchema } from './api';

@Schema()
export class ServiceMetadataSchema implements IServiceMetadata {
  @Field(String) target: Class;
  @Field() name: string;
  @Field() final: boolean;
  @Field() alias: string;
  @Field() inline: boolean;
  @Field(ref => ApiMetadataSchema) api: IApiMetadata;
  @Field(ref => ServiceMetadataSchema) base: IServiceMetadata;

  @Field(list => [InjectMetadataSchema]) dependencies: Record<string, IInjectMetadata>;
  @Field(list => [HandlerMetadataSchema]) handlers: Record<string, IHandlerMetadata>;

  @Field(ref => HandlerMetadataSchema) initializer: IHandlerMetadata;
  @Field(ref => HandlerMetadataSchema) selector: IHandlerMetadata;
  @Field(ref => HandlerMetadataSchema) activator: IHandlerMetadata;
  @Field(ref => HandlerMetadataSchema) releasor: IHandlerMetadata;

  @Field() source: string;

  public static RESOLVERS: SchemaResolvers<IServiceMetadata> = {
    target: obj => Utils.label(obj.target),
    dependencies: (obj, args) => Lo.filter(Object.values(obj.dependencies), args),
    handlers: (obj, args) => Lo.filter(Object.values(obj.handlers), args),
    source: obj => obj.target.toString(),
  };
}

@Schema()
export class InjectMetadataSchema implements IInjectMetadata {
  @Field(ref => ServiceMetadataSchema) service: ServiceMetadataSchema;
  @Field(ref => ServiceMetadataSchema) base?: ServiceMetadataSchema;
  @Field() resource: string;
  @Field(String) target?: Class;
  @Field(0) index?: number;

  public static RESOLVERS: SchemaResolvers<IInjectMetadata> = {
    target: obj => Utils.label(obj.target),
  };
}

@Schema()
export class HandlerMetadataSchema implements IHandlerMetadata {
  @Field(ref => ServiceMetadataSchema) service: ServiceMetadataSchema;
  @Field(ref => ServiceMetadataSchema) base?: ServiceMetadataSchema;
  @Field() method: string;
  @Field(String) target: Class;

  @Field() source: string;

  public static RESOLVERS: SchemaResolvers<IHandlerMetadata> = {
    target: obj => Utils.label(obj.target),
    source: obj => obj.target.toString(),
  };
}
