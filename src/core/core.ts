import { ProcessInfo } from 'exer';
import { Server } from 'http';
import { LambdaAdapter } from '../aws/adapter';
import { LambdaHandler } from '../aws/types';
import { Di } from '../import';
import { Logger } from '../logger';
import { Registry } from '../metadata/registry';
import { GraphQLToolkit } from '../tools/graphql';
import { Class, ContainerState, ObjectType, ServiceInfo } from '../types/core';
import { Roles } from '../types/security';
import { CoreGraphQL } from './graphql';
import { CoreInstance } from './instance';
import { CoreServer } from './server';
import { CoreThrift } from './thrift';

// TODO: https://stackoverflow.com/questions/13955157/how-to-define-static-property-in-typescript-interface
// export interface CoreInterface extends MetadataRegistry {
//   config: CoreOptions;
//   init(options?: CoreOptions): void;
//   start(port: number, basePath?: string, extraArgs?: any): void;
//   get(): Promise<CoreInstance>;
//   get<T>(api: ObjectType<T> | string): Promise<T>;
//   activate(): Promise<CoreInstance>;
//   invoke(api: string, method: string, ...args: any[]): Promise<any>;
//   lambda(): LambdaHandler;
//   serviceInfo(): ServiceInfo[];
//   processInfo(level?: number): ProcessInfo;
// }

export interface CoreOptions {
  application?: string;
  container?: string;
  version?: string;
  identity?: string;
  roles?: Roles;
  register?: Class[];
  crudAllowed?: boolean;
}

const LOAD_TIME = Math.round(process.uptime() * 1000);
const CREATED = new Date(Date.now() - Math.round(LOAD_TIME));

export abstract class Core extends Registry {
  public static readonly log = Logger.get('TYX', Core.name);

  public static readonly config: CoreOptions = {
    application: 'Core',
    container: LambdaAdapter.functionName,
    version: LambdaAdapter.functionVersion,
    identity: LambdaAdapter.identity,
    roles: { Public: true },
    register: [],
    crudAllowed: true
  };

  private static graphql: GraphQLToolkit;
  private static instance: CoreInstance;

  private static pool: CoreInstance[];
  private static counter: number = 0;
  public static initTime: number;

  protected constructor() { super(); }

  public static get schema(): GraphQLToolkit {
    return (this.graphql = this.graphql || new GraphQLToolkit(Core.validate(), this.config.crudAllowed));
  }

  public static init(options?: CoreOptions): void {
    if (this.instance) return;

    this.config.application = options.application || this.config.application;
    this.config.roles = options.roles || this.config.roles;
    this.config.register = options.register || this.config.register;
    this.config.crudAllowed = options.crudAllowed !== undefined ? !!options.crudAllowed : this.config.crudAllowed;

    Object.freeze(this.config);
    Object.freeze(this.config.register);

    Core.validate();

    // TODO: Freeze registry metadata

    try {
      CoreGraphQL.init(this.config.roles);
      CoreThrift.init(this.config.roles);
      this.instance = new CoreInstance(this.config.application, Core.name);
      this.instance.initialize();
      this.pool = [this.instance];
    } catch (err) {
      this.log.error('Failed to initialize');
      this.log.error(err);
      throw err;
    } finally {
      this.initTime = Math.round(process.uptime() * 1000) - LOAD_TIME;
    }
  }

  public static start(port: number, basePath?: string, extraArgs?: any): Server {
    return CoreServer.start(port, basePath, extraArgs);
  }

  public static stop(): void {
    return CoreServer.stop();
  }

  public static async get(): Promise<CoreInstance>;
  public static async get<T>(api: ObjectType<T> | string): Promise<T>;
  public static async get<T = any>(api?: ObjectType<T> | string): Promise<T | CoreInstance> {
    const ins = await this.activate();
    return api ? ins.get(api) : ins;
  }

  public static async activate(): Promise<CoreInstance> {
    this.init();
    let instance = this.pool.find(x => x.state === ContainerState.Ready);
    try {
      if (!instance) {
        instance = new CoreInstance(this.config.application, Core.name, this.counter++);
        // console.log('Create ->', instance.name);
        await instance.initialize();
        instance.reserve();
        this.pool.push(instance);
        this.counter++;
        this.instance = this.instance || instance;
      } else {
        // console.log('Reuse ->', instance.name);
        instance.reserve();
      }
    } catch (err) {
      this.log.error('Failed to activate instance');
      this.log.error(err);
      throw err;
    }
    return instance;
  }

  public static async invoke(api: string, method: string, ...args: any[]): Promise<any> {
    const instance = await this.activate();
    return await instance.apiRequest(api, method, args);
  }

  public static lambda(): LambdaHandler {
    return LambdaAdapter.export();
  }

  public static serviceInfo(): ServiceInfo[] {
    const glob: any = Di.Container.of(undefined);
    const services = [...glob.services];
    return services;
  }

  public static processInfo(level?: number): ProcessInfo {
    const info = ProcessInfo.get(level);
    return {
      ...info,
      application: this.config.application,
      container: this.config.container,
      version: this.config.version,
      identity: this.config.identity,
      initTime: this.initTime,
      loadTime: LOAD_TIME,
      created: CREATED,
    };
  }
}

// declare global {
//   // tslint:disable-next-line:variable-name
//   const Core: CoreInterface;
// }
// (global as any).Core = Core;
