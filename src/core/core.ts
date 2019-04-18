import { ProcessInfo } from 'exer';
import { DocumentNode } from 'graphql';
import { Server } from 'http';
import { LambdaAdapter } from '../aws/adapter';
import { LambdaHandler } from '../aws/types';
import { Di } from '../import';
import { Logger } from '../logger';
import { Registry } from '../metadata/registry';
import { EntityResolver } from '../orm/types';
import { GraphQLToolkit } from '../tools/graphql';
// tslint:disable-next-line:max-line-length
import { ContainerState, Context, CoreOptions, ObjectType, ResolverArgs, ResolverInfo, ResolverQuery, ServiceInfo } from '../types/core';
import { Env } from '../types/env';
import { CoreGraphQL } from './graphql';
import { CoreInstance } from './instance';
import { CoreServer } from './server';
import { CoreThrift } from './thrift';

const LOAD_TIME = Math.round(process.uptime() * 1000);
const CREATED = new Date(Date.now() - Math.round(LOAD_TIME));

class This {
  public static init: Promise<boolean>;
  public static graphql: GraphQLToolkit;
  public static instance: CoreInstance;
  public static pool: CoreInstance[];
  public static counter: number = 0;
  public static initTime: number;
}

// @CoreStatic()
export class Core extends Registry {
  @Logger('TYX', 'Core')
  public static readonly log: Logger;

  public static readonly config: CoreOptions = {
    application: 'Core',
    stage: 'default',
    container: Env.lambdaFunctionName,
    version: Env.lambdaFunctionVersion,
    identity: Env.identity,
    roles: { Public: true },
    register: [],
    crudAllowed: true,
    initPool: 0
  };

  constructor() {
    super();
    throw new TypeError('Core is singleton');
  }

  public static get schema(): GraphQLToolkit {
    return (This.graphql = This.graphql || new GraphQLToolkit(Core.validate(), this.config.crudAllowed));
  }

  public static init(options?: CoreOptions): Promise<boolean> {
    // Avoid init reentry
    if (This.init) return This.init;

    this.config.application = options.application || this.config.application;
    this.config.stage = options.stage || this.config.stage;
    this.config.roles = options.roles || this.config.roles;
    this.config.register = options.register || this.config.register;
    this.config.crudAllowed = options.crudAllowed !== undefined ? !!options.crudAllowed : this.config.crudAllowed;
    Object.freeze(this.config);
    Object.freeze(this.config.register);

    Core.validate();
    // TODO: Freeze registry metadata
    // Activate API classes
    for (const api of Object.values(Registry.ApiMetadata)) {
      api.activate(this);
    }
    CoreGraphQL.init(this.config.roles);
    CoreThrift.init(this.config.roles);

    return (This.init = this.asyncInit(options));
  }

  public static async asyncInit(options?: CoreOptions): Promise<boolean> {
    try {
      This.instance = new CoreInstance(this.config.application, Core.name);
      await This.instance.init();
      This.pool = [This.instance];
      This.counter = 1;
      // Init pool
      for (let i = 0; i < (this.config.initPool || 0); i++) {
        const ins = new CoreInstance(this.config.application, Core.name, This.counter++);
        await ins.init();
        This.pool.push(ins);
      }
    } catch (err) {
      this.log.error('Failed to initialize');
      this.log.error(err);
      throw err;
    } finally {
      This.initTime = Math.round(process.uptime() * 1000) - LOAD_TIME;
    }
    return true;
  }

  public static async start(port: number, basePath?: string, extraArgs?: any): Promise<Server> {
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

  public static async activate(fresh?: boolean): Promise<CoreInstance> {
    await this.init();
    let instance = !fresh && This.pool.find(x => x.state === ContainerState.Ready);
    try {
      if (!instance) {
        instance = new CoreInstance(this.config.application, Core.name, This.counter++);
        this.log.info('Create:', instance.name);
        await instance.init();
        instance.reserve();
        This.pool.push(instance);
        This.instance = This.instance || instance;
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

  public static async invoke(proxy: any, method: string, ...args: any[]): Promise<any> {
    const instance = await this.activate();
    return instance.invoke(proxy, method, ...args);
  }

  public static async resolve(
    memberId: string,
    obj: any,
    args: ResolverQuery & ResolverArgs,
    ctx: Context,
    info?: ResolverInfo
  ): Promise<any> {
    // Avoid creating isntances for metadata queries
    const [target, member] = memberId.split('.');
    const meta: any = Registry.CoreMetadata[target];
    if (meta) {
      if (meta.target.RESOLVERS && meta.target.RESOLVERS[member]) {
        return meta.target.RESOLVERS[member](obj, args, ctx, info);
      } else {
        return undefined;
      }
    }
    const instance = await this.activate();
    return instance.resolve(memberId, obj, args, ctx, info);
  }

  public static async execute(ctx: Context, source: string, variables?: Record<string, any>): Promise<any>;
  public static async execute(ctx: Context, document: DocumentNode, variables?: Record<string, any>): Promise<any>;
  public static async execute(ctx: Context, oper: DocumentNode | string, variables?: Record<string, any>): Promise<any> {
    const instance = await this.activate();
    return instance.execute(ctx, oper as any, variables);
  }

  public static lambda(options?: CoreOptions): LambdaHandler {
    return LambdaAdapter.export(Core.init(options));
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
      initTime: This.initTime,
      loadTime: LOAD_TIME,
      created: CREATED,
    };
  }

  public static poolInfo(): CoreInstance[] {
    return This.pool;
  }

  // Entity resolvers

  private static prepareResolve(ctx: Context, entityId: string, rel?: string) {
    const [provider, name] = entityId.split('.');
    const db = ctx.container.get<EntityResolver>(provider);
    const entity = db.metadata.entities.find(e => e.name === name);
    const relation = rel && entity.relations.find(r => r.name === rel);
    return { db, entity, relation };
  }

  public static findResolve(
    name: string,
    obj: ResolverArgs,
    args: ResolverArgs,
    ctx: Context,
    info?: ResolverInfo
  ): Promise<any> {
    const { db, entity } = this.prepareResolve(ctx, name);
    return db.get(entity, obj, args, ctx, info);
  }

  public static searchResolve(
    name: string,
    obj: ResolverArgs,
    args: ResolverArgs,
    ctx: Context,
    info?: ResolverInfo
  ): Promise<any> {
    const { db, entity } = this.prepareResolve(ctx, name);
    return db.search(entity, obj, args, ctx, info);
  }

  public static createResolve(
    name: string,
    obj: any,
    args: ResolverQuery & ResolverArgs,
    ctx: Context,
    info?: ResolverInfo
  ): Promise<any> {
    const { db, entity } = this.prepareResolve(ctx, name);
    return db.create(entity, obj, args, ctx, info);
  }

  public static updateResolve(
    name: string,
    obj: any,
    args: ResolverQuery & ResolverArgs,
    ctx: Context,
    info?: ResolverInfo
  ): Promise<any> {
    const { db, entity } = this.prepareResolve(ctx, name);
    return db.update(entity, obj, args, ctx, info);
  }

  public static removeResolve(
    name: string,
    obj: any,
    args: ResolverQuery & ResolverArgs,
    ctx: Context,
    info?: ResolverInfo
  ): Promise<any> {
    const { db, entity } = this.prepareResolve(ctx, name);
    return db.remove(entity, obj, args, ctx, info);
  }

  public static oneToManyResolve(
    name: string,
    relId: string,
    root: ResolverArgs,
    query: ResolverQuery,
    ctx?: Context,
    info?: ResolverInfo,
  ): Promise<any[]> {
    const { db, entity, relation } = this.prepareResolve(ctx, name, relId);
    return db.oneToMany(entity, relation, root, query, ctx, info);
  }

  public static oneToOneResolve(
    name: string,
    relId: string,
    root: ResolverArgs,
    query: ResolverQuery,
    ctx?: Context,
    info?: ResolverInfo,
  ): Promise<any> {
    const { db, entity, relation } = this.prepareResolve(ctx, name, relId);
    return db.oneToOne(entity, relation, root, query, ctx, info);
  }

  public static manyToOneResolve(
    name: string,
    relId: string,
    root: ResolverArgs,
    query: ResolverQuery,
    ctx?: Context,
    info?: ResolverInfo,
  ): Promise<any> {
    const { db, entity, relation } = this.prepareResolve(ctx, name, relId);
    return db.manyToOne(entity, relation, root, query, ctx, info);
  }

  public static manyToManyResolve(
    name: string,
    relId: string,
    root: ResolverArgs,
    query: ResolverQuery,
    ctx?: Context,
    info?: ResolverInfo,
  ): Promise<any[]> {
    const { db, entity, relation } = this.prepareResolve(ctx, name, relId);
    return db.manyToMany(entity, relation, root, query, ctx, info);
  }
}

// declare global {
//   // tslint:disable-next-line:variable-name
//   const Core: CoreInterface;
// }
// (global as any).Core = Core;
