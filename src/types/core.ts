import { ServiceIdentifier, ServiceMetadata as TypeDiServiceMetadata } from 'typedi';
import { ResolverContainer } from '../graphql/types';
import { MethodMetadata } from '../metadata/method';
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

export class Context {
  public container: CoreContainer = undefined;
  public requestId: string;
  public sourceIp: string;
  public method: MethodMetadata;
  public auth: AuthInfo;
  constructor(ctx?: Context) {
    if (ctx) Object.assign(this, ctx);
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

export interface CoreContainer extends ResolverContainer {
  state: ContainerState;

  serviceInfo(): ServiceInfo[];
  processInfo(): ProcessInfo;

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
