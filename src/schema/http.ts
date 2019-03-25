import { Schema } from '../decorators/schema';
import { Field } from '../decorators/type';
import { IApiMetadata } from '../metadata/api';
import { HttpBinder, HttpBindingType, IHttpBindingMetadata, IHttpRouteMetadata } from '../metadata/http';
import { IMethodMetadata } from '../metadata/method';
import { IServiceMetadata } from '../metadata/service';
import { Class, ResolverArgs, SchemaResolvers } from '../types/core';
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
  @Field(ref => ServiceMetadataSchema) servicer: IServiceMetadata;

  @Field() route: string;
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
