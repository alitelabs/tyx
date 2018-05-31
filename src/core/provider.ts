import { Database } from "../decorators/database";
import { Activator, Inject } from "../decorators/service";
import { ToolkitArgs, ToolkitContext, ToolkitInfo, ToolkitProvider, ToolkitQuery } from "../graphql";
import { Orm } from "../import";
import { Logger } from "../logger";
import { DatabaseMetadata } from "../metadata/database";
import { EntityMetadata } from "../metadata/entity";
import { getConnection } from "../orm";
import { Configuration } from "../types/config";
import { Class } from "../types/core";

export { Connection, ConnectionOptions, EntityManager, Repository } from "../import/typeorm";

export class DatabaseProvider implements Database, ToolkitProvider {

    @Inject(Configuration)
    public config: Configuration;

    public log = Logger.get(this);
    public label: string;

    protected connection: Orm.Connection;
    public manager: Orm.EntityManager;

    public get entities(): Class[] { return DatabaseMetadata.get(this).targets; }

    public get metadata(): EntityMetadata[] { return DatabaseMetadata.get(this).entities; }
    // { return this.connection.entityMetadatas as any; }

    public getMetadata(entity: string | Function): EntityMetadata {
        return this.connection.getMetadata(entity) as any;
    }

    @Activator()
    protected async activate() {
        if (!this.connection) {
            // TODO: Multiple connections, name from metadata
            this.connection = getConnection();
            this.manager = this.connection.manager;
        }
        if (!this.connection.isConnected) await this.connection.connect();
    }

    // Schema provider interface

    public create(type: string, obj: ToolkitArgs, args: ToolkitArgs, context: ToolkitContext, info?: ToolkitInfo): Promise<any> {
        let record = this.manager.create<any>(type, args);
        // TODO: Generate PK
        return this.manager.save(record);
    }

    public update(type: string, obj: ToolkitArgs, args: ToolkitArgs, context: ToolkitContext, info?: ToolkitInfo): Promise<any> {
        let record = this.manager.create(type, args);
        // TODO: Generate PK
        return this.manager.save(record);
    }

    public remove(type: string, obj: ToolkitArgs, args: ToolkitArgs, context: ToolkitContext, info?: ToolkitInfo): Promise<any> {
        let record = this.manager.create(type, args);
        // TODO: Generate PK
        return this.manager.remove(record);
    }

    public get(type: string, obj: ToolkitArgs, args: ToolkitArgs, context: ToolkitContext, info?: ToolkitInfo): Promise<any> {
        return this.prepareQuery(type, args, null, context).getOne();
    }

    public search(type: string, obj: ToolkitArgs, args: ToolkitQuery, context: ToolkitContext, info?: ToolkitInfo): Promise<any[]> {
        return this.prepareQuery(type, null, args, context).getMany();
    }

    public oneToMany(type: string, rel: string, root: ToolkitArgs, query: ToolkitQuery, context?: ToolkitContext, info?: ToolkitInfo): Promise<any> {
        let entity = this.getMetadata(type);
        let relation = entity.relations.find(r => r.propertyName === rel);
        let target = relation.inverseEntityMetadata.name;
        let pks = entity.primaryColumns.map(col => col.propertyName);
        let fks = relation.inverseRelation.joinColumns.map(col => col.propertyName);
        let keys: any = {};
        fks.forEach((fk, i) => keys[fk] = root[pks[i]]);
        return this.prepareQuery(target, keys, query, context).getMany();
    }

    public oneToOne(type: string, rel: string, root: ToolkitArgs, query: ToolkitQuery, context: ToolkitContext, info?: ToolkitInfo): Promise<any> {
        let entity = this.getMetadata(type);
        let relation = entity.relations.find(r => r.propertyName === rel);
        let target = relation.inverseEntityMetadata.name;
        let pks = relation.inverseEntityMetadata.primaryColumns.map(p => p.propertyName);
        let fks = relation.joinColumns.length ?
            relation.joinColumns.map(col => col.propertyName) :
            entity.primaryColumns.map(col => col.propertyName);
        let keys: any = {};
        pks.forEach((pk, i) => keys[pk] = root[fks[i]]);
        return this.prepareQuery(target, keys, query, context).getOne();
    }

    public manyToOne(type: string, rel: string, root: ToolkitArgs, query: ToolkitQuery, context: ToolkitContext, info?: ToolkitInfo): Promise<any> {
        let entity = this.getMetadata(type);
        let relation = entity.relations.find(r => r.propertyName === rel);
        let target = relation.inverseEntityMetadata.name;
        let pks = relation.inverseEntityMetadata.primaryColumns.map(p => p.propertyName);
        let fks = relation.joinColumns.map(col => col.propertyName);
        let keys: any = {};
        pks.forEach((pk, i) => keys[pk] = root[fks[i]]);
        return this.prepareQuery(target, keys, query, context).getOne();
    }

    public prepareQuery(type: string, keys: ToolkitArgs, query: ToolkitQuery, context: ToolkitContext): Orm.SelectQueryBuilder<any> {
        let sql = ToolkitQuery.prepareSql(keys, query);
        let builder: Orm.SelectQueryBuilder<any> = this.manager.createQueryBuilder(type, ToolkitQuery.ALIAS)
            .where(sql.where, sql.params);
        sql.order.forEach(ord => builder.addOrderBy(ord.column, ord.asc ? "ASC" : "DESC"));
        if (sql.skip) builder.skip(sql.skip);
        if (sql.take) builder.take(sql.take);
        return builder;
    }
}
