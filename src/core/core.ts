import { LambdaAdapter, LambdaHandler } from '../aws/adapter';
import { CoreSchema } from '../graphql/schema';
import { Di } from '../import';
import { Connection, ConnectionOptions, getConnection, getConnectionManager } from '../import/typeorm';
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
  private static options: ConnectionOptions;
  private static connection: Connection;

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
    this.pool = [this.instance];

    const cfg: string = process.env.DATABASE;
    if (!cfg) return;

    // this.label = options.substring(options.indexOf("@") + 1);
    const tokens = cfg.split(/:|@|\/|;/);
    const logQueries = tokens.findIndex(x => x === 'logall') > 5;
    // let name = (this.config && this.config.appId || "tyx") + "#" + (++DatabaseProvider.instances);

    // invalid connection
    if (tokens.length < 5) {
      return;
    }

    const slavesConfig: string = process.env.DB_SLAVES;

    if (slavesConfig) {
      const slaves = slavesConfig.split(';').map(host => ({
        username: tokens[0],
        password: tokens[1],
        host,
        port: +tokens[4],
        database: tokens[5],
      }));

      this.options = {
        type: tokens[2] as any,
        name: 'tyx',
        replication: {
          master: {
            username: tokens[0],
            password: tokens[1],
            host: tokens[3],
            port: +tokens[4],
            database: tokens[5],
          },
          slaves,
        },
        // timezone: "Z",
        logging: logQueries ? 'all' : ['error'],
        entities: Object.values(Metadata.EntityMetadata).map(meta => meta.target),
      };
    } else {
      this.options = {
        name: 'tyx',
        username: tokens[0],
        password: tokens[1],
        type: tokens[2] as any,
        host: tokens[3],
        port: +tokens[4],
        database: tokens[5],
        // timezone: "Z",
        logging: logQueries ? 'all' : ['error'],
        entities: Object.values(Metadata.EntityMetadata).map(meta => meta.target),
      };
    }
    if (!getConnectionManager().has('tyx')) {
      this.connection = getConnectionManager().create(this.options);
      this.log.info('Connection created');
    }
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
    if (this.options) {
      if (!this.connection) {
        this.log.info('Connecting');
        this.connection = getConnection('tyx');
      }
      if (!this.connection.isConnected) {
        await this.connection.connect();
        this.log.info('Connected');
      }
    }

    let instance = this.pool.find(x => x.state === ContainerState.Ready);
    if (!instance) {
      instance = new CoreInstance(this.application, Core.name, this.counter++);
      // console.log('Create ->', instance.name);
      instance.reserve();
      this.pool.push(instance);
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

  public static async release(force?: boolean) {
    if (this.connection && !process.env.IS_OFFLINE && !force) {
      await this.connection.close();
      this.log.info('Connection closed');
    }
    if (WTF) WTF.dump();
  }

  public static lambda(): LambdaHandler {
    return new LambdaAdapter().export();
  }
}

(global as any).Core = Core;
