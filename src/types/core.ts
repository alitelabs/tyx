import { String } from 'aws-sdk/clients/rdsdataservice';
import { DocumentNode, GraphQLResolveInfo } from 'graphql';
import { ServiceIdentifier, ServiceMetadata as TypeDiServiceMetadata } from 'typedi';
import { ApiMetadata } from '../metadata/api';
import { DatabaseMetadata } from '../metadata/database';
import { EntityMetadata } from '../metadata/entity';
import { MethodMetadata } from '../metadata/method';
import { MetadataRegistry, Registry } from '../metadata/registry';
import { RelationMetadata } from '../metadata/relation';
import { ServiceMetadata } from '../metadata/service';
import { EventRequest, EventResult } from './event';
import { HttpRequest, HttpResponse } from './http';
import { RemoteRequest, RemoteResponse } from './proxy';
import { AuthInfo } from './security';

export interface Class extends Function { }
export interface Prototype extends Object { }

export type ObjectType<T = any> = { new(...args: any[]): T };
export type NameRef = (type?: any) => string;
export type ClassRef<T = any> = (type?: any) => ObjectType<T>;
export type TypeRef<T = any> = (type?: any) => (ObjectType<T> | [ObjectType<T>]);

export interface Context {
  container: CoreContainer;
  requestId: string;
  sourceIp: string;
  method: MethodMetadata;
  auth: AuthInfo;

  resolve?: ResolverFunction;
  execute?: ExecuteFunction;
  metadata?: MetadataRegistry;

  provider?: any; // TODO: Type
  results?: Record<string, any[]>;
}

export class Context {
  public container: CoreContainer = undefined;
  public requestId: string;
  public sourceIp: string;
  public method: MethodMetadata;
  public auth: AuthInfo;

  constructor(ctx?: Context) {
    if (ctx) Object.assign(this, ctx);
    if (!this.container) return;
    this.resolve = this.container.resolve.bind(this.container);
    this.execute = this.container.execute.bind(this.container, this);
    this.metadata = this.container.metadata();
    this.provider = ProviderResolver; // TODO
  }
}

export interface Request {
  type: 'remote' | 'internal' | 'http' | 'event' | 'graphql';
  application: string;
  service: string;
  method: string;
  requestId: string;
}

export enum ContainerState {
  Pending = -1,
  Ready = 0,
  Reserved = 1,
  Busy = 2,
}

// tslint:disable-next-line:variable-name
export const CoreContainer = 'container';

export interface CoreContainer {
  state: ContainerState;
  name: string;

  metadata(): Registry;

  serviceInfo(core?: boolean): ServiceInfo[];
  processInfo(): ProcessInfo;
  instances(): CoreContainer[];

  has<T = any>(id: Class | ApiMetadata | ServiceMetadata | string): boolean;
  get<T = any>(id: Class | ApiMetadata | ServiceMetadata | string): T;

  resolve(method: string, obj: any, args: ResolverQuery & ResolverArgs, ctx: Context, info: ResolverInfo): Promise<any>;
  execute(ctx: Context, source: string, variables?: Record<string, any>): Promise<any>;
  execute(ctx: Context, document: DocumentNode, variables?: Record<string, any>): Promise<any>;

  apiRequest(api: string, method: string, args: any[]): Promise<any>;
  httpRequest(req: HttpRequest): Promise<HttpResponse>;
  eventRequest(req: EventRequest): Promise<EventResult>;
  remoteRequest(req: RemoteRequest): Promise<RemoteResponse>;
}

export interface MemoryInfo {
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
}

export interface ProcessInfo {
  name: string;
  state: string;
  timestamp: Date;
  versions: any;
  uptime: number;
  loadTime: number;
  initTime: number;
  // TODO: Statistics, mem usage, uptime etc
  // Package and modules size
  memory: MemoryInfo;
  node: any;
  root: ModuleInfo;
  moduleCount: number;
  packageCount: number;
  scriptSize: number;
  packages: PackageInfo[];
  modules: ModuleInfo[];
}

export interface PackageInfo {
  name: string;
  level: number;
  size: number;
  parent: PackageInfo;
  import: ModuleInfo;
  modules: ModuleInfo[];
  uses: PackageInfo[];
}

export interface ModuleInfo {
  id: string;
  name: string;
  file: string;
  size: number;
  level: number;
  parent: ModuleInfo;
  package: PackageInfo;
}

/**
 * Service metadata is used to initialize service and store its state.
 */
export interface ServiceInfo<T = any, K extends keyof T = any> extends TypeDiServiceMetadata<T, K> {

  /**
   * Class type of the registering service.
   * Can be omitted only if instance is set.
   * If id is not set then it serves as service id.
   */
  type?: Function;

  /**
   * Indicates if this service must be global and same instance must be used across all containers.
   */
  global?: boolean;

  /**
   * Indicates if instance of this class must be created on each its request.
   * Global option is ignored when this option is used.
   */
  transient?: boolean;

  /**
   * Allows to setup multiple instances the different classes under a single service id string or token.
   */
  multiple?: boolean;

  /**
   * Service unique identifier.
   */
  id?: ServiceIdentifier;

  /**
   * Factory function used to initialize this service.
   * Can be regular function ("createCar" for example),
   * or other service which produces this instance ([CarFactory, "createCar"] for example).
   */
  factory?: [ObjectType<T>, K] | ((...params: any[]) => any);

  /**
   * Instance of the target class.
   */
  value?: any;

}

export interface ResolverFunction {
  (method: string, obj: any, args: ResolverQuery & ResolverArgs, ctx: Context, info: ResolverInfo): Promise<any>;
}

export interface ExecuteFunction {
  (oper: DocumentNode | string, variables: Record<string, any>): Promise<any>;
}

export type InputNode = Record<string, string | boolean | number>;
export type ArrayNode = Record<string, string[] | boolean[] | number[]>;
export type LikeNode = Record<string, string>;
export type NullNode = Record<string, boolean>;
export type OrderNode = Record<string, number>;

// https://docs.mongodb.com/manual/reference/operator/

export interface ResolverExpression {
  if?: InputNode;
  eq?: InputNode;
  gt?: InputNode;
  gte?: InputNode;
  lt?: InputNode;
  lte?: InputNode;
  ne?: InputNode;
  like?: LikeNode;
  nlike?: LikeNode;
  rlike?: LikeNode;
  in?: ArrayNode;
  nin?: ArrayNode;
  nil?: NullNode;
  not?: ResolverExpression;
  nor?: ResolverExpression;
  and?: ResolverExpression[];
  or?: ResolverExpression[];
}

export interface ResolverQuery extends ResolverExpression {
  order?: OrderNode;
  where?: string;
  offset?: number;
  limit?: number;
  exists?: boolean;
  skip?: number;
  take?: number;
  query?: ResolverQuery;
}

export type ResolverArgs = any;

export type ResolverInfo = GraphQLResolveInfo;

export type SchemaResolvers<T> = { [P in keyof T]?: Resolver<T> };

export type InfoSchemaResolvers<T = any, V = any> = { [P in keyof T]?: Resolver<V> };

export interface Resolver<O = any> {
  (obj?: O, args?: ResolverQuery & ResolverArgs, ctx?: Context, info?: ResolverInfo): Promise<any> | any;
}

export interface EntityResolver {
  metadata: DatabaseMetadata;
  get: QueryResolver;
  search: QueryResolver;
  create: MutationResolver;
  update: MutationResolver;
  remove: MutationResolver;
  oneToMany: RelationResolver;
  oneToOne: RelationResolver;
  manyToOne: RelationResolver;
  manyToMany: RelationResolver;
}

export abstract class ProviderResolver {

  private static resolve(ctx: Context, entityId: string, rel?: string) {
    const [alias, name] = entityId.split('.');
    const db = ctx.container.get<EntityResolver>(alias);
    const entity = db.metadata.entities.find(e => e.name === name);
    const relation = rel && entity.relations.find(r => r.name === rel);
    return { db, entity, relation };
  }

  public static async get(
    entityId: string,
    obj: ResolverArgs,
    args: ResolverArgs,
    ctx: Context,
    info?: ResolverInfo
  ): Promise<any> {
    const { db, entity } = this.resolve(ctx, entityId);
    return db.get(entity, obj, args, ctx, info);
  }

  public static async search(
    entityId: string,
    obj: ResolverArgs,
    args: ResolverArgs,
    ctx: Context,
    info?: ResolverInfo
  ): Promise<any> {
    const { db, entity } = this.resolve(ctx, entityId);
    return db.search(entity, obj, args, ctx, info);
  }

  public static async create(
    entityId: string,
    obj: any,
    args: ResolverQuery & ResolverArgs,
    ctx: Context,
    info?: ResolverInfo
  ): Promise<any> {
    const { db, entity } = this.resolve(ctx, entityId);
    return db.create(entity, obj, args, ctx, info);
  }

  public static async update(
    entityId: string,
    obj: any,
    args: ResolverQuery & ResolverArgs,
    ctx: Context,
    info?: ResolverInfo
  ): Promise<any> {
    const { db, entity } = this.resolve(ctx, entityId);
    return db.update(entity, obj, args, ctx, info);
  }

  public static async remove(
    entityId: String,
    obj: any,
    args: ResolverQuery & ResolverArgs,
    ctx: Context,
    info?: ResolverInfo
  ): Promise<any> {
    const { db, entity } = this.resolve(ctx, entityId);
    return db.remove(entity, obj, args, ctx, info);
  }

  public static async oneToMany(
    entityId: string,
    relId: string,
    root: ResolverArgs,
    query: ResolverQuery,
    ctx?: Context,
    info?: ResolverInfo,
  ): Promise<any[]> {
    const { db, entity, relation } = this.resolve(ctx, entityId, relId);
    return db.oneToMany(entity, relation, root, query, ctx, info);
  }

  public static oneToOne(
    entityId: string,
    relId: string,
    root: ResolverArgs,
    query: ResolverQuery,
    ctx?: Context,
    info?: ResolverInfo,
  ): Promise<any> {
    const { db, entity, relation } = this.resolve(ctx, entityId, relId);
    return db.oneToOne(entity, relation, root, query, ctx, info);
  }

  public static manyToOne(
    entityId: string,
    relId: string,
    root: ResolverArgs,
    query: ResolverQuery,
    ctx?: Context,
    info?: ResolverInfo,
  ): Promise<any> {
    const { db, entity, relation } = this.resolve(ctx, entityId, relId);
    return db.manyToOne(entity, relation, root, query, ctx, info);
  }

  public static manyToMany(
    entityId: string,
    relId: string,
    root: ResolverArgs,
    query: ResolverQuery,
    ctx?: Context,
    info?: ResolverInfo,
  ): Promise<any[]> {
    const { db, entity, relation } = this.resolve(ctx, entityId, relId);
    return db.manyToMany(entity, relation, root, query, ctx, info);
  }
}

export interface MutationResolver {
  (
    entity: EntityMetadata,
    obj: any,
    args: ResolverQuery & ResolverArgs,
    ctx: Context,
    info?: ResolverInfo,
  ): Promise<any>;
}

export interface QueryResolver {
  (
    entity: EntityMetadata,
    obj: ResolverArgs,
    args: ResolverArgs,
    ctx: Context,
    info?: ResolverInfo,
  ): Promise<any>;
}

export interface RelationResolver {
  (
    entity: EntityMetadata,
    rel: RelationMetadata,
    root: ResolverArgs,
    query: ResolverQuery,
    ctx?: Context,
    info?: ResolverInfo,
  ): Promise<any>;
}
