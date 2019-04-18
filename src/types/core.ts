import { ProcessInfo } from 'exer';
import { DocumentNode, GraphQLResolveInfo } from 'graphql';
import { Server } from 'http';
import { ServiceIdentifier, ServiceMetadata as TypeDiServiceMetadata } from 'typedi';
import { LambdaHandler } from '../aws/types';
import { Logger } from '../logger';
import { ApiMetadata } from '../metadata/api';
import { MethodMetadata } from '../metadata/method';
import { MetadataRegistry, Registry } from '../metadata/registry';
import { ServiceMetadata } from '../metadata/service';
import { EventRequest, EventResult } from './event';
import { HttpRequest, HttpResponse } from './http';
import { RemoteRequest, RemoteResponse } from './proxy';
import { AuthInfo, Roles } from './security';

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
  // results?: Record<string, any[]>;
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
  }
}

export interface Request {
  type: 'remote' | 'internal' | 'http' | 'event' | 'graphql' | 'ping';
  requestId: string;
  // application: string;
  service: string;
  method: string;
}

export enum ContainerState {
  Pending = -1,
  Ready = 0,
  Reserved = 1,
  Busy = 2,
}

export interface CoreOptions {
  application?: string;
  stage?: string;
  container?: string;
  version?: string;
  identity?: string;
  roles?: Roles;
  register?: Class[];
  crudAllowed?: boolean;
  initPool?: number;
}

/* class decorator */
// TODO: Move as StaticImplements to exer
// https://stackoverflow.com/questions/13955157/how-to-define-static-property-in-typescript-interface
// tslint:disable-next-line:function-name
export function CoreStatic() {
  return (constructor: CoreStatic) => constructor;
}

export interface CoreStatic extends MetadataRegistry {
  new(): {};

  config: CoreOptions;
  log: Logger;
  schema: any;

  isValidated(): boolean;
  validate(force?: boolean): Registry;
  // build(...args: any[]): any;
  // copy(...args: any[]): any;

  init(options?: CoreOptions): void;

  get(): Promise<CoreContainer>;
  get<T>(api: ObjectType<T> | string): Promise<T>;

  activate(): Promise<CoreContainer>;
  invoke(proxy: any, method: string, ...args: any[]): Promise<any>;
  resolve(memberId: string, obj: any, args: ResolverQuery & ResolverArgs, ctx: Context, info?: ResolverInfo): Promise<any>;

  serviceInfo(): ServiceInfo[];
  processInfo(level?: number): ProcessInfo;

  lambda(): LambdaHandler;
  start(port: number, basePath?: string, extraArgs?: any): Promise<Server>;
  stop(): void;

  [key: string]: any;
}

// tslint:disable-next-line:variable-name
export const CoreContainer = 'container';

export interface CoreContainer {
  state: ContainerState;
  name: string;

  init(): Promise<void>;

  serviceInfo(core?: boolean): ServiceInfo[];
  processInfo(): ProcessInfo;
  instances(): CoreContainer[];

  has<T = any>(id: Class | ApiMetadata | ServiceMetadata | string): boolean;
  get<T = any>(id: Class | ApiMetadata | ServiceMetadata | string): T;

  invoke(api: string, method: string, args: any[]): Promise<any>;
  resolve(method: string, obj: any, args: ResolverQuery & ResolverArgs, ctx: Context, info: ResolverInfo): Promise<any>;
  execute(ctx: Context, source: string, variables?: Record<string, any>): Promise<any>;
  execute(ctx: Context, document: DocumentNode, variables?: Record<string, any>): Promise<any>;

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
