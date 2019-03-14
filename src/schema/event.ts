import { Schema } from '../decorators/schema';
import { Field } from '../decorators/type';
import { ResolverArgs, SchemaResolvers } from '../graphql/types';
import { IApiMetadata } from '../metadata/api';
import { IEventRouteMetadata } from '../metadata/event';
import { IMethodMetadata } from '../metadata/method';
import { IServiceMetadata } from '../metadata/service';
import { Class } from '../types/core';
import { ApiMetadataSchema } from './api';
import { MethodMetadataSchema } from './method';
import { ServiceMetadataSchema } from './service';

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
