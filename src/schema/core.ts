// tslint:disable-next-line:import-name
import { Schema } from '../decorators/schema';
import { Field } from '../decorators/type';
import { InfoSchemaResolvers, ResolverContext } from '../graphql/types';
import { Class, ServiceInfo } from '../types/core';
import { Utils } from '../utils';

import Lo = require('lodash');

@Schema()
export class ServiceInfoSchema {
  @Field() mode: string;
  @Field() id: string;
  @Field(String) type: Class;
  @Field() value: string;
  @Field() global: boolean;
  @Field() transient: boolean;

  constructor(s: ServiceInfo) {
    this.id = Utils.label(s.id);
    this.mode = typeof s.id === 'string' ? s.type ? 'alias' : 'value' : 'type';
    this.type = Utils.label(s.type);
    this.value = Utils.label(s.value);
    this.global = !!s.global;
    this.transient = !!s.transient;
  }

  public static RESOLVERS: InfoSchemaResolvers<ServiceInfoSchema> = {
  };
}

@Schema()
export class InstanceInfoSchema {
  @Field() name: string;
  @Field(list => [ServiceInfoSchema]) context: ServiceInfoSchema[];

  public static get(ctx: ResolverContext) {
    return ctx.container;
  }

  public static RESOLVERS: InfoSchemaResolvers<CoreInfoSchema, ResolverContext | any> = {
    context: (obj, args) => {
      const info = obj.info().map((s: ServiceInfo) => new ServiceInfoSchema(s));
      if (args.target) args.target = `[class: ${args.target}]`;
      if (args.type) args.type = `[class: ${args.type}]`;
      return Lo.filter(info, args);
    }
  };
}

@Schema()
export class CoreInfoSchema {
  @Field() name: string;
  @Field(list => [ServiceInfoSchema]) global: ServiceInfoSchema[];
  @Field(list => [ServiceInfoSchema]) context: ServiceInfoSchema[];
  @Field(list => [InstanceInfoSchema]) pool: InstanceInfoSchema[];

  // TODO: Statistics .....

  public static get(ctx: ResolverContext) {
    return ctx.container;
  }

  public static RESOLVERS: InfoSchemaResolvers<CoreInfoSchema, ResolverContext | any> = {
    global: (obj, args) => {
      const info = obj.info(true).map((s: ServiceInfo) => new ServiceInfoSchema(s));
      if (args.target) args.target = `[class: ${args.target}]`;
      if (args.type) args.type = `[class: ${args.type}]`;
      return Lo.filter(info, args);
    },
    context: (obj, args) => {
      const info = obj.info().map((s: ServiceInfo) => new ServiceInfoSchema(s));
      if (args.target) args.target = `[class: ${args.target}]`;
      if (args.type) args.type = `[class: ${args.type}]`;
      return Lo.filter(info, args);
    },
    pool: (obj, args) => {
      return (obj.name === 'Core') ? obj.instances() : undefined;
    }
  };
}
