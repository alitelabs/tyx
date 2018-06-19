// tslint:disable-next-line:import-name
import Lo = require('lodash');
import { Schema } from '../decorators/schema';
import { Field } from '../decorators/type';
import { SchemaResolvers } from '../graphql/types';
import { IApiMetadata } from '../metadata/api';
import { EventRouteMetadata, HttpRouteMetadata, IMethodMetadata } from '../metadata/method';
import { Class } from '../types/core';
import { Utils } from '../utils';
import { EventRouteMetadataSchema, HttpRouteMetadataSchema, MethodMetadataSchema } from './method';

@Schema()
export class ApiMetadataSchema implements IApiMetadata {
  @Field(String) target: Class;
  @Field() name: string;
  @Field() alias: string;

  @Field(list => [MethodMetadataSchema]) methods: Record<string, IMethodMetadata>;
  @Field(list => [HttpRouteMetadataSchema]) routes: Record<string, HttpRouteMetadata>;
  @Field(list => [EventRouteMetadataSchema]) events: Record<string, EventRouteMetadata[]>;

  @Field() source: string;

  public static RESOLVERS: SchemaResolvers<IApiMetadata> = {
    target: obj => Utils.value(obj.target),
    methods: (obj, args) => Lo.filter(Object.values(obj.methods), args),
    routes: (obj, args) => Lo.filter(Object.values(obj.routes), args),
    events: (obj, args) => Lo.filter(Lo.concat([], ...Object.values(obj.events)), args),
    source: obj => obj.target.toString(),
  };
}
