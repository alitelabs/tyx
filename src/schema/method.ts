// tslint:disable-next-line:import-name
import Lo = require('lodash');
import { Schema } from '../decorators/schema';
import { Field } from '../decorators/type';
import { IApiMetadata } from '../metadata/api';
import { IEventRouteMetadata } from '../metadata/event';
import { IHttpBindingMetadata, IHttpRouteMetadata } from '../metadata/http';
import { IInputMetadata } from '../metadata/input';
import { IDesignMetadata, IMethodMetadata, MethodType } from '../metadata/method';
import { IResultMetadata, ResultSelect } from '../metadata/result';
import { } from '../metadata/var';
import { Class, ClassRef, SchemaResolvers } from '../types/core';
import { Roles } from '../types/security';
import { Utils } from '../utils';
import { ApiMetadataSchema } from './api';
import { EventRouteMetadataSchema } from './event';
import { HttpBindingMetadataSchema, HttpRouteMetadataSchema } from './http';
import { InputMetadataSchema, ResultMetadataSchema } from './type';

@Schema()
export class MethodMetadataSchema implements IMethodMetadata {
  @Field(String) target: Class;
  @Field(ref => ApiMetadataSchema) api: IApiMetadata;
  @Field(ref => ApiMetadataSchema) base: IApiMetadata;
  @Field() type: MethodType;

  @Field(String) scope: ClassRef;

  @Field() name: string;
  @Field(Object) design: IDesignMetadata[];

  @Field() auth: string;
  @Field(Object) roles: Roles;

  @Field() query: boolean;
  @Field() mutation: boolean;
  @Field() resolver: boolean;
  @Field(list => [InputMetadataSchema]) inputs: IInputMetadata[];
  @Field(ref => ResultMetadataSchema) result: IResultMetadata;
  @Field(Object) select: ResultSelect;

  @Field() contentType: string;
  @Field(list => [HttpBindingMetadataSchema]) bindings: IHttpBindingMetadata[];
  @Field(list => [HttpRouteMetadataSchema]) http: Record<string, IHttpRouteMetadata>;
  @Field(list => [EventRouteMetadataSchema]) events: Record<string, IEventRouteMetadata>;

  @Field() source: string;

  public static RESOLVERS: SchemaResolvers<IMethodMetadata> = {
    target: obj => Utils.label(obj.target),
    scope: obj => Utils.label(obj.scope),
    inputs: (obj, args) => Lo.filter(Object.values(obj.inputs || {}), args),
    bindings: (obj, args) => Lo.filter(Object.values(obj.bindings || {}), args),
    http: (obj, args) => Lo.filter(Object.values(obj.http || {}), args),
    events: (obj, args) => Lo.filter(Object.values(obj.events || {}), args),
    source: obj => obj.target.prototype[obj.name].toString(),
  };
}
