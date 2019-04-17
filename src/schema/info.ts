import { CpuInfo, ModuleInfo, NetworkInfo, PackageInfo, ProcessInfo } from "exer";
import { Schema } from "../decorators/schema";
import { Field } from "../decorators/type";
import { Any } from "../metadata/var";
import { InfoSchemaResolvers, SchemaResolvers } from "../types/core";
import { Lodash } from "./lodash";

@Schema()
export class CpuInfoSchema implements CpuInfo {
  @Field() model: string;
  @Field() speed: number;
  @Field() user: number;
  @Field() nice: number;
  @Field() sys: number;
  @Field() idle: number;
  @Field() irq: number;
  public static RESOLVERS: InfoSchemaResolvers<CpuInfoSchema> = {};
}

@Schema()
export class NetworkInfoSchema implements NetworkInfo {
  @Field() name: string;
  @Field() address: string;
  @Field() netmask: string;
  @Field() family: string;
  @Field() mac: string;
  @Field() internal: boolean;
  @Field() cidr: string;
  public static RESOLVERS: InfoSchemaResolvers<NetworkInfoSchema> = {};
}

@Schema()
export class PackageInfoSchema implements PackageInfo {
  @Field() name: string;
  @Field() version: string;
  @Field() description: string;
  @Field() size: number;
  @Field() path: string;
  @Field(Any) json: any;
  @Field() level: number;
  @Field() moduleCount: number;
  @Field(ref => PackageInfoSchema) parent: PackageInfo;
  @Field(ref => ModuleInfoSchema) import: ModuleInfo;
  @Field(list => [ModuleInfoSchema]) modules: ModuleInfo[];
  @Field(list => [PackageInfoSchema]) imports: PackageInfo[];
  @Field(list => [PackageInfoSchema]) uses: PackageInfo[];

  public static RESOLVERS: SchemaResolvers<PackageInfoSchema> = {
    modules: (obj, args) => Lodash.filter(obj.modules, args),
    imports: (obj, args) => Lodash.filter(obj.imports, args),
    uses: (obj, args) => Lodash.filter(obj.uses, args),
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
export class ProcessInfoSchema implements ProcessInfo {
  // Function
  @Field() application: string;
  @Field() container: string;
  @Field() version: string;
  @Field() identity: string;
  // Stats
  @Field() created: Date;
  @Field() zerostamp: number;
  @Field() loadTime: number;
  @Field() initTime: number;
  // Runtime
  @Field() timestamp: Date;
  @Field() microstamp: number;
  @Field() state: string;
  @Field() serial: number;
  @Field() uptime: number;
  // Usage
  @Field() memory: number;
  @Field() heapTotal: number;
  @Field() heapUsed: number;
  @Field() external: number;
  @Field() cpuUser: number;
  @Field() cpuSystem: number;
  @Field() cpuUserTotal: number;
  @Field() cpuSystemTotal: number;
  @Field() moduleCount: number;
  @Field() packageCount: number;
  @Field() scriptSize: number;
  // Instance
  // @Field() instance: string;
  @Field(Any) node: any;
  @Field(list => [CpuInfoSchema]) cpus: CpuInfo[];
  @Field(list => [NetworkInfoSchema]) networks: NetworkInfo[];
  // Package and code size
  @Field(ref => ModuleInfoSchema) entry: ModuleInfo;
  packages: PackageInfo[];
  modules: ModuleInfo[];
  public static RESOLVERS: SchemaResolvers<ProcessInfo> = {};
}

// TODO: Statistics .....
