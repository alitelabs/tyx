import { EntityManager, SelectQueryBuilder } from "tyxorm";
import { EntityMetadata } from "../metadata";
import { ToolkitArgs, ToolkitQuery } from "./query";
import { ToolkitContext, ToolkitInfo, ToolkitProvider } from "./schema";

export interface IRecord {
    created: Date;
    updated: Date;
    version: number;
}

export class TypeOrmProvider implements ToolkitProvider {
    public static readonly LIMIT = 1000;

    constructor(private manager: EntityManager) { }

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
        let entity: EntityMetadata = this.manager.connection.getMetadata(type) as any;
        let relation = entity.relations.find(r => r.propertyName === rel);
        let target = relation.inverseEntityMetadata.name;
        let pks = entity.primaryColumns.map(col => col.propertyName);
        let fks = relation.inverseRelation.joinColumns.map(col => col.propertyName);
        let keys: any = {};
        fks.forEach((fk, i) => keys[fk] = root[pks[i]]);
        return this.prepareQuery(target, keys, query, context).getMany();
    }

    public oneToOne(type: string, rel: string, root: ToolkitArgs, query: ToolkitQuery, context: ToolkitContext, info?: ToolkitInfo): Promise<any> {
        let entity: EntityMetadata = this.manager.connection.getMetadata(type) as any;
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
        let entity: EntityMetadata = this.manager.connection.getMetadata(type) as any;
        let relation = entity.relations.find(r => r.propertyName === rel);
        let target = relation.inverseEntityMetadata.name;
        let pks = relation.inverseEntityMetadata.primaryColumns.map(p => p.propertyName);
        let fks = relation.joinColumns.map(col => col.propertyName);
        let keys: any = {};
        pks.forEach((pk, i) => keys[pk] = root[fks[i]]);
        return this.prepareQuery(target, keys, query, context).getMany();
    }

    public prepareQuery(type: string, keys: ToolkitArgs, query: ToolkitQuery, context: ToolkitContext): SelectQueryBuilder<any> {
        let sql = ToolkitQuery.prepareSql(keys, query);
        let builder: SelectQueryBuilder<any> = this.manager.createQueryBuilder(type, ToolkitQuery.ALIAS)
            .where(sql.where, sql.params);
        sql.order.forEach(ord => builder.addOrderBy(ord.column, ord.asc ? "ASC" : "DESC"));
        if (sql.skip) builder.skip(sql.skip);
        if (sql.take) builder.take(sql.take);
        return builder;
    }
}


