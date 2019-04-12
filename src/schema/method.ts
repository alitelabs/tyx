import { Schema } from '../decorators/schema';
import { Field } from '../decorators/type';
import { IApiMetadata } from '../metadata/api';
import { IEventRouteMetadata } from '../metadata/event';
import { IHttpBindingMetadata, IHttpRouteMetadata } from '../metadata/http';
import { IArgMetadata } from '../metadata/input';
import { IMethodMetadata, MethodType } from '../metadata/method';
import { IResultMetadata } from '../metadata/result';
import { TypeSelect } from '../metadata/type';
import { Class, ClassRef, SchemaResolvers } from '../types/core';
import { Roles } from '../types/security';
import { ApiMetadataSchema } from './api';
import { EventRouteMetadataSchema } from './event';
import { HttpBindingMetadataSchema, HttpRouteMetadataSchema } from './http';
import { Lodash } from './lodash';
import { ArgMetadataSchema as ArgMetadataSchema, ResultMetadataSchema } from './type';

@Schema()
export class MethodMetadataSchema implements IMethodMetadata {
  @Field(String) target: Class;
  @Field(ref => ApiMetadataSchema) api: IApiMetadata;
  @Field(ref => ApiMetadataSchema) base: IApiMetadata;
  @Field() type: MethodType;

  @Field(String) scope: ClassRef;

  @Field() name: string;

  @Field() auth: string;
  @Field(Object) roles: Roles;

  @Field() query: boolean;
  @Field() mutation: boolean;
  @Field() resolver: boolean;

  @Field(list => [ArgMetadataSchema]) args: IArgMetadata[];
  @Field(ref => ResultMetadataSchema) result: IResultMetadata;
  @Field(Object) select: TypeSelect;

  @Field() contentType: string;
  @Field(list => [HttpBindingMetadataSchema]) bindings: IHttpBindingMetadata[];
  @Field(list => [HttpRouteMetadataSchema]) http: Record<string, IHttpRouteMetadata>;
  @Field(list => [EventRouteMetadataSchema]) events: Record<string, IEventRouteMetadata>;

  @Field() source: string;

  public static RESOLVERS: SchemaResolvers<IMethodMetadata> = {
    target: obj => Lodash.label(obj.target),
    scope: obj => Lodash.label(obj.scope),
    args: (obj, args) => Lodash.filter(obj.args, args),
    bindings: (obj, args) => Lodash.filter(obj.bindings, args),
    http: (obj, args) => Lodash.filter(obj.http, args),
    events: (obj, args) => Lodash.filter(obj.events, args),
    source: obj => obj.target.prototype[obj.name].toString(),
  };
}
