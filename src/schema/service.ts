import { Schema } from '../decorators/schema';
import { Field } from '../decorators/type';
import { IApiMetadata } from '../metadata/api';
import { IHandlerMetadata, IInjectMetadata, IServiceMetadata } from '../metadata/service';
import { Class, ClassRef, SchemaResolvers } from '../types/core';
import { ApiMetadataSchema } from './api';
import { SchemaUtils } from './utils';

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
    target: obj => SchemaUtils.label(obj.target),
    dependencies: (obj, args) => SchemaUtils.filter(obj.dependencies, args),
    handlers: (obj, args) => SchemaUtils.filter(obj.handlers, args),
    source: obj => obj.target.toString(),
  };
}

@Schema()
export class InjectMetadataSchema implements IInjectMetadata {
  @Field(ref => ServiceMetadataSchema) host: ServiceMetadataSchema;
  @Field(ref => ServiceMetadataSchema) base?: ServiceMetadataSchema;
  @Field() property: string;
  @Field() resource: string;
  @Field(String) target?: Class;
  @Field(String) ref?: ClassRef;
  @Field(0) index?: number;

  public static RESOLVERS: SchemaResolvers<IInjectMetadata> = {
    target: obj => SchemaUtils.label(obj.target),
    ref: obj => SchemaUtils.label(obj.ref)
  };
}

@Schema()
export class HandlerMetadataSchema implements IHandlerMetadata {
  @Field(ref => ServiceMetadataSchema) host: ServiceMetadataSchema;
  @Field(ref => ServiceMetadataSchema) base?: ServiceMetadataSchema;
  @Field() method: string;
  @Field() override: boolean;

  @Field() source: string;

  public static RESOLVERS: SchemaResolvers<IHandlerMetadata> = {
    source: obj => obj.host.target.prototype[obj.method].toString()
  };
}
