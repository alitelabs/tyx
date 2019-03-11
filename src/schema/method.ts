// tslint:disable-next-line:import-name
import Lo = require('lodash');
import { Schema } from '../decorators/schema';
import { Field } from '../decorators/type';
import { ResolverArgs, SchemaResolvers } from '../graphql/types';
import { IApiMetadata } from '../metadata/api';
// tslint:disable-next-line:max-line-length
import { DesignMetadata, HttpAdapter, HttpBinder, HttpBindingType, IEventRouteMetadata, IHttpBindingMetadata, IHttpRouteMetadata, IMethodMetadata } from '../metadata/method';
import { IServiceMetadata } from '../metadata/service';
import { IInputMetadata, IResultMetadata, Select } from '../metadata/type';
import { Class } from '../types/core';
import { EventAdapter } from '../types/event';
import { HttpCode } from '../types/http';
import { Roles } from '../types/security';
import { Utils } from '../utils';
import { ApiMetadataSchema } from './api';
import { ServiceMetadataSchema } from './service';
import { InputMetadataSchema, ResultMetadataSchema } from './type';

@Schema()
export class HttpBindingMetadataSchema implements IHttpBindingMetadata {
  @Field(String) type: HttpBindingType;
  @Field() path: string;
  @Field(String) binder: HttpBinder;

  public static RESOLVERS: SchemaResolvers<IHttpBindingMetadata> = {
    binder: (obj: IHttpBindingMetadata) => obj.binder && `[function: ${obj.binder.toString()}]`
  };
}

@Schema()
export class HttpRouteMetadataSchema implements IHttpRouteMetadata {
  @Field(String) target: Class;
  @Field(ref => ApiMetadataSchema) api: IApiMetadata;
  @Field(ref => MethodMetadataSchema) method: IMethodMetadata;
  @Field(ref => HttpRouteMetadataSchema) base: IHttpRouteMetadata;
  @Field(ref => HttpRouteMetadataSchema) over: IHttpRouteMetadata;
  @Field(ref => ServiceMetadataSchema) service: IServiceMetadata;

  @Field() route: string;
  @Field() handler: string;
  @Field() verb: string;
  @Field() resource: string;
  @Field() model: string;
  @Field([String]) params: string[];
  @Field(0) code: HttpCode;
  @Field(String) adapter: HttpAdapter;
  // Relations
  // api: ApiMetadata;
  // method: MethodMetadata;

  public static RESOLVERS: SchemaResolvers<IHttpRouteMetadata> = {
    target: (obj: IHttpRouteMetadata, args: ResolverArgs) => obj.target && `[class: ${obj.target.name}]`,
    adapter: (obj: IHttpRouteMetadata) => obj.adapter && `[function: ${obj.adapter.toString()}]`
  };
}

@Schema()
export class EventRouteMetadataSchema implements IEventRouteMetadata {
  @Field(String) target: Class;
  @Field(ref => ApiMetadataSchema) api: IApiMetadata;
  @Field(ref => MethodMetadataSchema) method: IMethodMetadata;
  @Field(ref => EventRouteMetadataSchema) base: IEventRouteMetadata;
  @Field(ref => EventRouteMetadataSchema) over: IEventRouteMetadata;
  @Field(ref => ServiceMetadataSchema) service: IServiceMetadata;

  @Field() route: string;
  @Field() handler: string;
  @Field() source: string;
  @Field() resource: string;
  @Field() objectFilter: string;
  @Field() actionFilter: string;
  @Field(String) adapter: EventAdapter;

  public static RESOLVERS: SchemaResolvers<IEventRouteMetadata> = {
    target: (obj: IEventRouteMetadata, args: ResolverArgs) => obj.target && `[class: ${obj.target.name}]`,
    adapter: (obj: IEventRouteMetadata) => obj.adapter && `[function: ${obj.adapter.toString()}]`
  };
}

@Schema()
export class MethodMetadataSchema implements IMethodMetadata {
  @Field(String) target: Class;
  @Field(ref => ApiMetadataSchema) api: IApiMetadata;
  @Field(ref => ApiMetadataSchema) base: IApiMetadata;
  @Field(String) host: Class;

  @Field() name: string;
  @Field(Object) design: DesignMetadata[];

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
