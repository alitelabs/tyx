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

  public static RESOLVERS: InfoSchemaResolvers<ServiceInfoSchema> = {
  };
}

@Schema()
export class CoreInfoSchema {
  @Field() name: string;
  @Field(list => [ServiceInfoSchema]) services: ServiceInfoSchema[];

  public static get(ctx: ResolverContext) {
    return ctx.container;
  }

  public static RESOLVERS: InfoSchemaResolvers<CoreInfoSchema, ResolverContext | any> = {
    services: (obj, args) => {
      const info = obj.info().map((s: ServiceInfo) => ({
        id: Utils.label(s.id),
        mode: typeof s.id === 'string' ? s.type ? 'alias' : 'value' : 'type',
        type: Utils.label(s.type),
        value: Utils.label(s.value),
        global: !!s.global,
        transient: !!s.transient
      }));

      if (args.target) args.target = `[class: ${args.target}]`;
      if (args.type) args.type = `[class: ${args.type}]`;
      return Lo.filter(info, args);
    }
  };
}
