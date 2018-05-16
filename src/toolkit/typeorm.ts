import { SelectQueryBuilder } from "typeorm";
import { ToolkitArgs, ToolkitQuery } from "./query";
import { ToolkitContext, ToolkitInfo, ToolkitProvider } from "./schema";

export interface IRecord {
    created: Date;
    updated: Date;
    version: number;
}

export namespace Implementation {

    export const LIMIT = 1000;

    export function create(type: string, obj: ToolkitArgs, args: ToolkitArgs, context: ToolkitContext, info?: ToolkitInfo): Promise<any> {
        let record = context.manager.create<any>(type, args);
        // TODO: Generate PK
        return context.manager.save(record);
    }

    export function update(type: string, obj: ToolkitArgs, args: ToolkitArgs, context: ToolkitContext, info?: ToolkitInfo): Promise<any> {
        let record = context.manager.create(type, args);
        // TODO: Generate PK
        return context.manager.save(record);
    }

    export function remove(type: string, obj: ToolkitArgs, args: ToolkitArgs, context: ToolkitContext, info?: ToolkitInfo): Promise<any> {
        let record = context.manager.create(type, args);
        // TODO: Generate PK
        return context.manager.remove(record);
    }

    export function get(type: string, obj: ToolkitArgs, args: ToolkitArgs, context: ToolkitContext, info?: ToolkitInfo): Promise<any> {
        return prepareQuery(type, args, null, context).getOne();
    }

    export function search(type: string, obj: ToolkitArgs, args: ToolkitQuery, context: ToolkitContext, info?: ToolkitInfo): Promise<any[]> {
        return prepareQuery(type, null, args, context).getMany();
    }

    export function oneToMany(type: string, rel: string, root: ToolkitArgs, query: ToolkitQuery, context?: ToolkitContext, info?: ToolkitInfo): Promise<any> {
        let entity = context.manager.connection.getMetadata(type);
        let relation = entity.relations.find(r => r.propertyName === rel);
        let target = relation.inverseEntityMetadata.name;
        let pks = relation.entityMetadata.primaryColumns.map(col => col.propertyName);
        let fks = relation.inverseRelation.joinColumns.map(col => col.propertyName);
        let keys: any = {};
        fks.forEach((fk, i) => keys[fk] = root[pks[i]]);
        return prepareQuery(target, keys, query, context).getMany();
    }

    export function oneToOne(type: string, rel: string, root: ToolkitArgs, query: ToolkitQuery, context: ToolkitContext, info?: ToolkitInfo): Promise<any> {
        let entity = context.manager.connection.getMetadata(type);
        let relation = entity.relations.find(r => r.propertyName === rel);
        let target = relation.inverseEntityMetadata.name;
        let pks = relation.inverseEntityMetadata.primaryColumns.map(p => p.propertyName);
        let fks = relation.joinColumns.length ?
            relation.joinColumns.map(col => col.propertyName) :
            relation.entityMetadata.primaryColumns.map(col => col.propertyName);
        let keys: any = {};
        pks.forEach((pk, i) => keys[pk] = root[fks[i]]);
        return prepareQuery(target, keys, query, context).getOne();
    }

    export function manyToOne(type: string, rel: string, root: ToolkitArgs, query: ToolkitQuery, context: ToolkitContext, info?: ToolkitInfo): Promise<any> {
        let entity = context.manager.connection.getMetadata(type);
        let relation = entity.relations.find(r => r.propertyName === rel);
        let target = relation.inverseEntityMetadata.name;
        let pks = relation.inverseEntityMetadata.primaryColumns.map(p => p.propertyName);
        let fks = relation.joinColumns.map(col => col.propertyName);
        let keys: any = {};
        pks.forEach((pk, i) => keys[pk] = root[fks[i]]);
        return prepareQuery(target, keys, query, context).getMany();
    }

    export function prepareQuery(type: string, keys: ToolkitArgs, query: ToolkitQuery, context: ToolkitContext): SelectQueryBuilder<any> {
        let sql = ToolkitQuery.prepareSql(keys, query);
        let builder: SelectQueryBuilder<any> = context.manager.createQueryBuilder(type, ToolkitQuery.ALIAS)
            .where(sql.where, sql.params);
        sql.order.forEach(ord => builder.addOrderBy(ord.column, ord.asc ? "ASC" : "DESC"));
        if (sql.skip) builder.skip(sql.skip);
        if (sql.take) builder.take(sql.take);
        return builder;
    }
}

export const TypeOrm: ToolkitProvider = Implementation;

