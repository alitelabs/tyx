import { Schema } from '../decorators/schema';
import { Field } from '../decorators/type';
import { Any } from '../metadata/var';
// tslint:disable-next-line:max-line-length
import { Class, Context, InfoSchemaResolvers, MemoryInfo, ModuleInfo, PackageInfo, ProcessInfo, SchemaResolvers, ServiceInfo } from '../types/core';
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
      return Lo.filter(info, args);
    }
  };
}

@Schema()
export class PackageInfoSchema implements PackageInfo {
  @Field() name: string;
  @Field() size: number;
  @Field() level: number;
  @Field(ref => PackageInfoSchema) parent: PackageInfo;
  @Field(ref => ModuleInfoSchema) import: ModuleInfo;
  @Field(list => [ModuleInfoSchema]) modules: ModuleInfo[];
  @Field(list => [PackageInfoSchema]) imports: PackageInfo[];
  @Field(list => [PackageInfoSchema]) uses: PackageInfo[];

  public static RESOLVERS: SchemaResolvers<PackageInfoSchema> = {
    modules: (obj, args) => Lo.filter(Lo.concat([], ...Object.values(obj.modules)), args),
    imports: (obj, args) => Lo.filter(Lo.concat([], ...Object.values(obj.imports)), args),
    uses: (obj, args) => Lo.filter(Lo.concat([], ...Object.values(obj.uses)), args),
  };
}

@Schema()
export class ModuleInfoSchema implements ModuleInfo {
  @Field() id: string;
  @Field() name: string;
  @Field() file: string;
  @Field() size: number;
  @Field() level: number;
  @Field(ref => ModuleInfoSchema) parent: ModuleInfo;
  @Field(ref => PackageInfoSchema) package: PackageInfo;
}

@Schema()
export class MemoryInfoSchema implements MemoryInfo {
  @Field() rss: number;
  @Field() heapTotal: number;
  @Field() heapUsed: number;
  @Field() external: number;
}

@Schema()
export class ProcessInfoSchema implements ProcessInfo {
  @Field() name: string;
  @Field() state: string;
  @Field() timestamp: Date;
  @Field(Any) versions: any;
  @Field() uptime: number;
  @Field() loadTime: number;
  @Field() initTime: number;
  @Field(ref => MemoryInfoSchema) memory: MemoryInfo;
  @Field(Any) node: any;
  // TODO: Statistics, mem usage, uptime etc
  // Package and modules size

  // Startup time based on process uptime
  @Field() moduleCount: number;
  @Field() packageCount: number;
  @Field() scriptSize: number;
  @Field(ref => ModuleInfoSchema) root: ModuleInfo;
  @Field(list => [PackageInfoSchema]) packages: PackageInfo[];
  @Field(list => [ModuleInfoSchema]) modules: ModuleInfo[];

  public static RESOLVERS: SchemaResolvers<ProcessInfo> = {
    packages: (obj, args) => Lo.filter(Lo.concat([], ...Object.values(obj.packages)), args),
    modules: (obj, args) => Lo.filter(Lo.concat([], ...Object.values(obj.modules)), args),
  };
}

// TODO: Statistics .....
