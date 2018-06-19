// tslint:disable-next-line:import-name
import Lo = require('lodash');
import { Metadata } from '../decorators/schema';
import { Field } from '../decorators/type';
import { SchemaResolvers } from '../graphql/types';
import { HandlerMetadata, InjectMetadata, IServiceMetadata } from '../metadata/service';
import { Class } from '../types/core';
import { Utils } from '../utils';

@Metadata()
export class InjectMetadataSchema implements InjectMetadata {
  @Field() resource: string;
  @Field(String) target?: Class;
  @Field(0) index?: number;

  public static RESOLVERS: SchemaResolvers<InjectMetadata> = {
    target: obj => Utils.value(obj.target),
  };
}

@Metadata()
export class HandlerMetadataSchema implements HandlerMetadata {
  @Field() service?: string;
  @Field() method: string;
  @Field(String) target: Class;

  @Field() source: string;

  public static RESOLVERS: SchemaResolvers<HandlerMetadata> = {
    target: obj => Utils.value(obj.target),
    source: obj => obj.target.toString(),
  };
}

@Metadata()
export class ServiceMetadataSchema implements IServiceMetadata {
  @Field(String) target: Class;
  @Field() name: string;
  @Field() alias: string;

  @Field(list => [InjectMetadataSchema]) dependencies: Record<string, InjectMetadata>;
  @Field(list => [HandlerMetadataSchema]) handlers: Record<string, HandlerMetadata>;

  @Field(ref => HandlerMetadataSchema) initializer: HandlerMetadata;
  @Field(ref => HandlerMetadataSchema) selector: HandlerMetadata;
  @Field(ref => HandlerMetadataSchema) activator: HandlerMetadata;
  @Field(ref => HandlerMetadataSchema) releasor: HandlerMetadata;

  @Field() source: string;

  public static RESOLVERS: SchemaResolvers<IServiceMetadata> = {
    target: obj => Utils.value(obj.target),
    dependencies: (obj, args) => Lo.filter(Object.values(obj.dependencies), args),
    handlers: (obj, args) => Lo.filter(Object.values(obj.handlers), args),
    source: obj => obj.target.toString(),
  };
}
