import { Database } from '../decorators/database';
import { Activate, CoreService, Initialize, Inject, Release } from '../decorators/service';
import { TypeOrm } from '../import';
import { Logger } from '../logger';
import { DatabaseMetadata } from '../metadata/database';
import { EntityMetadata } from '../metadata/entity';
import { Registry } from '../metadata/registry';
import { Configuration } from '../types/config';
import { Class, ObjectType } from '../types/core';
import { Env } from '../types/env';
import { TypeOrmProvider } from './typeorm';

let COUNTER = 0;

@CoreService()
export class DatabaseProvider extends TypeOrmProvider implements Database {
  public readonly id = COUNTER++;

  @Logger()
  protected log: Logger;

  @Inject(alias => Configuration)
  public config: Configuration;

  protected alias: string;
  protected options: TypeOrm.ConnectionOptions;
  protected readoptions: TypeOrm.ConnectionOptions;
  protected owner: boolean;
  protected connection: TypeOrm.Connection;
  protected readconnection: TypeOrm.Connection;
  public manager: TypeOrm.EntityManager;

  public get entities(): Class[] { return DatabaseMetadata.get(this).targets; }

  public get metadata(): DatabaseMetadata { return DatabaseMetadata.get(this); }
  // { return this.connection.entityMetadatas as any; }

  public getMetadata(entity: string | Function): EntityMetadata {
    return this.connection.getMetadata(entity) as any;
  }

  public getRepository<T>(type: ObjectType<T>) {
    return this.connection.getRepository<T>(type);
  }
  public getReadMetadata(entity: string | Function): EntityMetadata {
    return this.readconnection.getMetadata(entity) as any;
  }

  public getReadRepository<T>(type: ObjectType<T>) {
    return this.readconnection.getRepository<T>(type);
  }

  @Initialize()
  protected initialize() {
    if (this.connection) return;

    this.alias = DatabaseMetadata.get(this).alias;
    const cfg: string | any = this.config.database(this.alias);
    if (this.options || !cfg) return;

    // TODO: Temporary solution, support Options | string
    let tokens: string[] = [];
    let logQueries: Boolean;
    if (typeof cfg === 'string') {
      tokens = cfg.split(/:|@|\/|;/);
      logQueries = tokens.findIndex(x => x === 'logall') > 5;
    } else {
      tokens[0] = cfg.username;
      tokens[1] = cfg.password;
      tokens[2] = cfg.engine;
      tokens[3] = cfg.host;
      tokens[4] = cfg.port;
      tokens[5] = cfg.database;
      tokens[6] = cfg.readhost;
    }

    // invalid connection
    if (tokens.length < 5) {
      return;
    }

    // TODO: Check how slaves are handled with AWS SM

    // const slavesConfig: string = process.env.DB_SLAVES;
    // if (slavesConfig) {
    //   const slaves = slavesConfig.split(';').map(host => ({
    //     username: tokens[0],
    //     password: tokens[1],
    //     host,
    //     port: +tokens[4],
    //     database: tokens[5],
    //   }));

    //   this.options = {
    //     type: tokens[2] as any,
    //     name: this.alias,
    //     replication: {
    //       master: {
    //         username: tokens[0],
    //         password: tokens[1],
    //         host: tokens[3],
    //         port: +tokens[4],
    //         database: tokens[5],
    //       },
    //       slaves,
    //     },
    //     // timezone: "Z",
    //     logging: logQueries ? 'all' : ['error'],
    //     entities: Object.values(Registry.EntityMetadata).map(meta => meta.target),
    //   };
    // } else {

    this.options = {
      name: this.alias,
      username: tokens[0],
      password: tokens[1],
      type: tokens[2] as any,
      host: tokens[3],
      port: +tokens[4],
      database: tokens[5],
      // timezone: "Z",
      logging: logQueries ? 'all' : ['error'],
      entities: Object.values(Registry.EntityMetadata).map(meta => meta.target),
    };
    this.readoptions = {
      name: this.alias + "read",
      username: tokens[0],
      password: tokens[1],
      type: tokens[2] as any,
      host: cfg.readhost,
      port: +tokens[4],
      database: tokens[5],
      // timezone: "Z",
      logging: logQueries ? 'all' : ['error'],
      entities: Object.values(Registry.EntityMetadata).map(meta => meta.target),
    };

    if (!TypeOrm.getConnectionManager().has(this.alias)) {
      this.connection = TypeOrm.getConnectionManager().create(this.options);
      this.readconnection = TypeOrm.getConnectionManager().create(this.readoptions);
      this.log.info('Connections created');
    } else {
      this.connection = TypeOrm.getConnection(this.alias);
      this.readconnection = TypeOrm.getConnection(this.alias + "read");
    }
  }

  @Activate()
  protected async activate() {
    this.log.info('Activate: %s', this.id);
    this.initialize();
    if (!this.connection.isConnected) {
      await this.connection.connect();
      await this.readconnection.connect();
      this.owner = true;
      this.log.info('Connected:', this.id);
    } else {
      this.owner = false;
      this.log.info('Connection shared:', this.id);
    }
    this.manager = this.connection.manager;
  }

  @Release()
  protected async release() {
    this.log.info('Release: %s', this.id);
    if (!this.connection
      || !this.connection.isConnected
      || Env.isOffline
      || !Env.waitForEmptyEventLoop) return;
    if (!this.owner) {
      this.log.info('Connection shared: %s', this.id);
      return;
    }
    try {
      await (this.connection as any).desroy();
    } catch (err) {
      try {
        await (this.connection).close();
      } catch (error) {
        this.log.error(err);
      }
    }

    // separated try/catch block on purpuse
    try {
      await (this.readconnection as any).desroy();
    } catch (err) {
      try {
        await (this.readconnection).close();
      } catch (error) {
        this.log.error(err);
      }
    }
    this.log.info('Connection closed: %s', this.id);
  }
}
