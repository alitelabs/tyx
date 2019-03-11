import { createServer, Server } from 'http';
import { LambdaAdapter, LambdaHandler } from '../aws/adapter';
import { ExpressAdapter } from '../express/adapter';
import { CoreSchema } from '../graphql/schema';
import { Express } from '../import';
import { Connection, ConnectionOptions, createConnection } from '../import/typeorm';
import { Logger } from '../logger';
import { Metadata } from '../metadata/registry';
import { Class, ContainerState, ObjectType, Prototype } from '../types/core';
import { EventRequest, EventResult } from '../types/event';
import { HttpRequest, HttpResponse } from '../types/http';
import { RemoteRequest } from '../types/proxy';
import { CoreGraphQL } from './graphql';
import { CoreInstance } from './instance';

import Wtf = require('wtfnode');

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

  private static server: Server;

  private constructor() { }

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
  }

  public static async get(): Promise<CoreInstance>;
  public static async get<T>(api: ObjectType<T> | string): Promise<T>;
  public static async get<T = any>(api?: ObjectType<T> | string): Promise<T | CoreInstance> {
    const ins = await this.activate();
    return api ? ins.get(api) : ins;
  }

  public static async activate(): Promise<CoreInstance> {
    this.init();
    if (this.options) {
      if (!this.connection) {
        this.connection = await createConnection(this.options);
        this.log.info('Connection created');
      }
      if (!this.connection.isConnected) {
        await this.connection.connect();
        this.log.info('Connected');
      }
    }

    let instance = this.pool.find(x => x.state === ContainerState.Ready);
    if (!instance) {
      instance = new CoreInstance(this.application, Core.name, this.counter++);
      instance.reserve();
      this.pool.push(instance);
      this.instance = this.instance || instance;
    } else {
      instance.reserve();
    }
    return instance;
  }

  public static async invoke(api: Prototype, method: Function, ...args: any[]): Promise<any> {
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

  private static async release() {
    if (!this.server && this.connection) {
      await this.connection.close();
      this.log.info('Connection closed');
      Wtf.dump();
    }
  }

  public static lambda(): LambdaHandler {
    return new LambdaAdapter().export();
  }

  public static express(basePath?: string): Express.Express {
    return new ExpressAdapter(basePath || '/local').express();
  }

  public static start(port: number, basePath?: string, extraArgs?: any) {
    this.init();

    // tslint:disable-next-line:no-parameter-reassignment
    port = port || 5000;
    const adapter = new ExpressAdapter(basePath || '/local', extraArgs);

    const app = adapter.express();
    this.server = createServer(app);
    this.server.listen(port);

    this.log.info('👌  Server initialized.');
    adapter.paths.forEach(p => this.log.info(`${p[0]} http://localhost:${port}${p[1]}`));
    this.log.info('🚀  Server started at %s ...', port);
  }

  public static stop() {
    if (this.server) this.server.close();
    if (this.connection) this.connection.close();
  }
}
