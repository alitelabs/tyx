// tslint:disable-next-line:import-name
import Lo = require('lodash');
import { Schema } from '../decorators/schema';
import { Field } from '../decorators/type';
import { SchemaResolvers } from '../graphql/types';
import { IApiMetadata } from '../metadata/api';
import { IEventRouteMetadata } from '../metadata/event';
import { IHttpBindingMetadata, IHttpRouteMetadata } from '../metadata/http';
import { IDesignMetadata, IMethodMetadata } from '../metadata/method';
import { IInputMetadata, IResultMetadata, Select } from '../metadata/type';
import { Class } from '../types/core';
import { Roles } from '../types/security';
import { Utils } from '../utils';
import { ApiMetadataSchema } from './api';
import { EventRouteMetadataSchema, HttpBindingMetadataSchema, HttpRouteMetadataSchema } from './http';
import { InputMetadataSchema, ResultMetadataSchema } from './type';

@Schema()
export class MethodMetadataSchema implements IMethodMetadata {
  @Field(String) target: Class;
  @Field(ref => ApiMetadataSchema) api: IApiMetadata;
  @Field(ref => ApiMetadataSchema) base: IApiMetadata;
  @Field(String) host: Class;

  @Field() name: string;
  @Field(Object) design: IDesignMetadata[];

  @Field() auth: string;
  @Field(Object) roles: Roles;

  @Field() query: boolean;
  @Field() mutation: boolean;
  @Field() resolver: boolean;
  @Field(ref => InputMetadataSchema) input: IInputMetadata;
  @Field(ref => ResultMetadataSchema) result: IResultMetadata;
  @Field(Object) select: Select;

  @Field() contentType: string;
  @Field(list => [HttpBindingMetadataSchema]) bindings: IHttpBindingMetadata[];
  @Field(list => [HttpRouteMetadataSchema]) http: Record<string, IHttpRouteMetadata>;
  @Field(list => [EventRouteMetadataSchema]) events: Record<string, IEventRouteMetadata>;

  @Field() source: string;

  public static RESOLVERS: SchemaResolvers<IMethodMetadata> = {
    target: obj => Utils.label(obj.target),
    host: obj => Utils.label(obj.host),
    http: (obj, args) => Lo.filter(Object.values(obj.http || {}), args),
    events: (obj, args) => Lo.filter(Object.values(obj.events || {}), args),
    source: obj => obj.target.prototype[obj.name].toString(),
  };
}
