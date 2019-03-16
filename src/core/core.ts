import { LambdaAdapter, LambdaHandler } from '../aws/adapter';
import { CoreSchema } from '../graphql/schema';
import { Di } from '../import';
import { Logger } from '../logger';
import { Metadata } from '../metadata/registry';
import { Class, ContainerState, ObjectType, ServiceInfo } from '../types/core';
import { EventRequest, EventResult } from '../types/event';
import { HttpRequest, HttpResponse } from '../types/http';
import { RemoteRequest } from '../types/proxy';
import { CoreGraphQL } from './graphql';
import { CoreInstance } from './instance';

const WTF = process.env.WTF_NODE && require('wtfnode');

export abstract class Core {
  public static log = Logger.get('TYX', Core.name);

  private static graphql: CoreSchema;

  private static application: string;
  private static crudAllowed: boolean;
  private static instance: CoreInstance;

  private static pool: CoreInstance[];
  private static counter: number = 0;

  protected constructor() { }

  public static get metadata(): Metadata {
    return Metadata.get();
  }

  public static get schema(): CoreSchema {
    return (this.graphql = this.graphql || new CoreSchema(Metadata.validate(), this.crudAllowed));
  }

  public static register(...args: Class[]) { }

  // TODO: options object
  // Move database out
  public static init(application?: string, isPublic?: boolean, isCrud?: boolean): void;
  public static init(application?: string, register?: Class[], isCrud?: boolean): void;
  public static init(application?: string, args?: Class[] | boolean, isCrud?: boolean): void {
    if (this.instance) return;

    if (args === true) CoreGraphQL.makePublic();

    this.crudAllowed = !!isCrud;
    this.schema.executable();

    this.application = this.application || application || 'Core';
    this.instance = new CoreInstance(this.application, Core.name);
    this.instance.initialize();
    this.pool = [this.instance];
  }

  public static async get(): Promise<CoreInstance>;
  public static async get<T>(api: ObjectType<T> | string): Promise<T>;
  public static async get<T = any>(api?: ObjectType<T> | string): Promise<T | CoreInstance> {
    const ins = await this.activate();
    return api ? ins.get(api) : ins;
  }

  public static info(): ServiceInfo[] {
    const glob: any = Di.Container.of(undefined);
    const services = [...glob.services];
    return services;
  }

  public static async activate(): Promise<CoreInstance> {
    this.init();
    let instance = this.pool.find(x => x.state === ContainerState.Ready);
    if (!instance) {
      instance = new CoreInstance(this.application, Core.name, this.counter++);
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
    return instance;
  }

  public static async invoke(api: string, method: string, ...args: any[]): Promise<any> {
    try {
      const instance = await this.activate();
      return await instance.apiRequest(api, method, args);
    } finally {
      await this.release();
    }
  }

  public static async httpRequest(req: HttpRequest): Promise<HttpResponse> {
    try {
      const instance = await this.activate();
      return await instance.httpRequest(req);
    } finally {
      await this.release();
    }
  }

  public static async remoteRequest(req: RemoteRequest): Promise<any> {
    try {
      const instance = await this.activate();
      return await instance.remoteRequest(req);
    } finally {
      await this.release();
    }
  }

  public static async eventRequest(req: EventRequest): Promise<EventResult> {
    try {
      const instance = await this.activate();
      return await instance.eventRequest(req);
    } finally {
      await this.release();
    }
  }

  public static async release() {
    if (WTF) WTF.dump();
  }

  public static lambda(): LambdaHandler {
    return new LambdaAdapter().export();
  }
}

declare global {
  // tslint:disable-next-line:variable-name
  const Core: Core;
}
(global as any).Core = Core;
