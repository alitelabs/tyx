import { Database } from '../decorators/database';
import { Activate, CoreService, Initialize, Inject, Release } from '../decorators/service';
import { TypeOrm } from '../import';
import { Logger } from '../logger';
import { DatabaseMetadata } from '../metadata/database';
import { EntityMetadata } from '../metadata/entity';
import { Metadata } from '../metadata/registry';
import { Configuration } from '../types/config';
import { Class } from '../types/core';
import { TypeOrmProvider } from './typeorm';

@CoreService()
export class DatabaseProvider extends TypeOrmProvider implements Database {

  @Inject(alias => Configuration)
  public config: Configuration;

  public log = Logger.get(this);

  protected alias: string;
  protected options: TypeOrm.ConnectionOptions;
  protected connection: TypeOrm.Connection;
  public manager: TypeOrm.EntityManager;

  public get entities(): Class[] { return DatabaseMetadata.get(this).targets; }

  public get metadata(): DatabaseMetadata { return DatabaseMetadata.get(this); }
  // { return this.connection.entityMetadatas as any; }

  public getMetadata(entity: string | Function): EntityMetadata {
    return this.connection.getMetadata(entity) as any;
  }

  // TODO: Connection string in Configuration service
  @Initialize()
  protected initialize() {
    this.alias = DatabaseMetadata.get(this).alias;
    const cfg: string = process.env.DATABASE;
    if (this.options || !cfg) return;

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
        name: this.alias,
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
        entities: Object.values(Metadata.Entity).map(meta => meta.target),
      };
    } else {
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
        entities: Object.values(Metadata.Entity).map(meta => meta.target),
      };
    }
    if (!TypeOrm.getConnectionManager().has(this.alias)) {
      this.connection = TypeOrm.getConnectionManager().create(this.options);
      this.log.info('Connection created');
    }
  }

  @Activate()
  protected async activate() {
    if (!this.connection) {
      this.log.info('Connecting');
      this.connection = TypeOrm.getConnection(this.alias);
    }
    if (!this.connection.isConnected) {
      await this.connection.connect();
      this.log.info('Connected');
    }
    if (!this.manager) {
      this.manager = this.connection.manager;
    }
  }

  @Release()
  protected async release() {
    if (this.connection && !process.env.IS_OFFLINE) {
      await this.connection.close();
      this.log.info('Connection closed');
    }
  }
}
