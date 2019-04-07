import { Schema } from '../decorators/schema';
import { Field } from '../decorators/type';
import { IApiMetadata } from '../metadata/api';
import { IEventRouteMetadata } from '../metadata/event';
import { IHttpRouteMetadata } from '../metadata/http';
import { IMethodMetadata } from '../metadata/method';
import { IServiceMetadata } from '../metadata/service';
import { Class, SchemaResolvers } from '../types/core';
import { Utils } from '../utils';
import { EventRouteMetadataSchema } from './event';
import { HttpRouteMetadataSchema } from './http';
import { MethodMetadataSchema } from './method';
import { ServiceMetadataSchema } from './service';

@Schema()
export class ApiMetadataSchema implements IApiMetadata {
  @Field(String) target: Class;
  @Field() name: string;
  @Field() alias: string;

  @Field(ref => ServiceMetadataSchema) owner: IServiceMetadata;
  @Field(ref => ApiMetadataSchema) base: IApiMetadata;
  @Field(ref => ServiceMetadataSchema) servicer: IServiceMetadata;
  @Field(list => [ServiceMetadataSchema]) services: Record<string, IServiceMetadata>;

  @Field(list => [MethodMetadataSchema]) methods: Record<string, IMethodMetadata>;
  @Field(list => [HttpRouteMetadataSchema]) routes: Record<string, IHttpRouteMetadata>;
  @Field(list => [EventRouteMetadataSchema]) events: Record<string, IEventRouteMetadata[]>;

  @Field() source: string;

  public static RESOLVERS: SchemaResolvers<IApiMetadata> = {
    target: obj => Utils.label(obj.target),
    services: (obj, args) => Utils.filter(obj.services, args),
    methods: (obj, args) => Utils.filter(obj.methods, args),
    routes: (obj, args) => Utils.filter(obj.routes, args),
    events: (obj, args) => Utils.filter(obj.events, args),
    source: obj => obj.target.toString(),
  };
}
