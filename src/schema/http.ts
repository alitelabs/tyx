import { Schema } from '../decorators/schema';
import { Field } from '../decorators/type';
import { ResolverArgs, SchemaResolvers } from '../graphql/types';
import { IApiMetadata } from '../metadata/api';
import { IEventRouteMetadata } from '../metadata/event';
import { HttpBinder, HttpBindingType, IHttpBindingMetadata, IHttpRouteMetadata } from '../metadata/http';
import { IMethodMetadata } from '../metadata/method';
import { IServiceMetadata } from '../metadata/service';
import { Class } from '../types/core';
import { HttpCode } from '../types/http';
import { ApiMetadataSchema } from './api';
import { MethodMetadataSchema } from './method';
import { ServiceMetadataSchema } from './service';

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
  // Relations
  // api: ApiMetadata;
  // method: MethodMetadata;

  public static RESOLVERS: SchemaResolvers<IHttpRouteMetadata> = {
    target: (obj: IHttpRouteMetadata, args: ResolverArgs) => obj.target && `[class: ${obj.target.name}]`
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

  public static RESOLVERS: SchemaResolvers<IEventRouteMetadata> = {
    target: (obj: IEventRouteMetadata, args: ResolverArgs) => obj.target && `[class: ${obj.target.name}]`
  };
}
