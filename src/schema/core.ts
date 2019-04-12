import { Schema } from '../decorators/schema';
import { Field } from '../decorators/type';
// tslint:disable-next-line:max-line-length
import { Class, Context, InfoSchemaResolvers, ServiceInfo } from '../types/core';
import { Lodash } from './lodash';

@Schema()
export class ServiceInfoSchema {
  @Field() mode: string;
  @Field() id: string;
  @Field(String) type: Class;
  @Field() value: string;
  @Field() global: boolean;
  @Field() transient: boolean;

  constructor(s: ServiceInfo) {
    this.id = Lodash.label(s.id);
    this.mode = typeof s.id === 'string' ? s.type ? 'alias' : 'value' : 'type';
    this.type = Lodash.label(s.type);
    this.value = Lodash.label(s.value);
    this.global = !!s.global;
    this.transient = !!s.transient;
  }

  public static RESOLVERS: InfoSchemaResolvers<ServiceInfoSchema> = {};
}

@Schema()
export class InstanceInfoSchema {
  @Field() name: string;
  @Field() state: string;
  @Field(list => [ServiceInfoSchema]) context: ServiceInfoSchema[];

  public static get(ctx: Context) {
    return ctx.container;
  }

  public static RESOLVERS: InfoSchemaResolvers<InstanceInfoSchema, Context | any> = {
    context: (obj, args) => {
      const info = obj.serviceInfo().map((s: ServiceInfo) => new ServiceInfoSchema(s));
      if (args.target) args.target = `[class: ${args.target}]`;
      if (args.type) args.type = `[class: ${args.type}]`;
      return Lodash.filter(info, args);
    }
  };
}
