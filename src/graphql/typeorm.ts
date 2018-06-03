import { EntityMetadata } from "../metadata/entity";
import { RelationMetadata } from "../metadata/relation";
import { EntityManager, SelectQueryBuilder } from "../orm";
import { ToolkitArgs, ToolkitQuery } from "./query";
import { ToolkitContext, ToolkitInfo, ToolkitProvider } from "./schema";

export interface IRecord {
    created: Date;
    updated: Date;
    version: number;
}

export class TypeOrmProvider implements ToolkitProvider {
    public static readonly LIMIT = 1000;

    protected manager: EntityManager;

    constructor(manager?: EntityManager) { this.manager = manager; }

    public create(entity: EntityMetadata, obj: ToolkitArgs, args: ToolkitArgs, context: ToolkitContext, info?: ToolkitInfo): Promise<any> {
        let record = this.manager.create<any>(entity.name, args);
        // TODO: Generate PK
        return this.manager.save(record);
    }

    public update(entity: EntityMetadata, obj: ToolkitArgs, args: ToolkitArgs, context: ToolkitContext, info?: ToolkitInfo): Promise<any> {
        let record = this.manager.create(entity.name, args);
        // TODO: Generate PK
        return this.manager.save(record);
    }

    public remove(entity: EntityMetadata, obj: ToolkitArgs, args: ToolkitArgs, context: ToolkitContext, info?: ToolkitInfo): Promise<any> {
        let record = this.manager.create(entity.name, args);
        // TODO: Generate PK
        return this.manager.remove(record);
    }

    public get(entity: EntityMetadata, obj: ToolkitArgs, args: ToolkitArgs, context: ToolkitContext, info?: ToolkitInfo): Promise<any> {
        return this.prepareQuery(entity.name, args, null, context).getOne();
    }

    public search(entity: EntityMetadata, obj: ToolkitArgs, args: ToolkitQuery, context: ToolkitContext, info?: ToolkitInfo): Promise<any[]> {
        return this.prepareQuery(entity.name, null, args, context).getMany();
    }

    public oneToMany(entity: EntityMetadata, relation: RelationMetadata, root: ToolkitArgs, query: ToolkitQuery, context?: ToolkitContext, info?: ToolkitInfo): Promise<object[]> {
        let target = relation.inverseEntityMetadata.name;
        let pks = entity.primaryColumns.map(col => col.propertyName);
        let fks = relation.inverseRelation.joinColumns.map(col => col.propertyName);
        let keys: any = {};
        fks.forEach((fk, i) => keys[fk] = root[pks[i]]);
        return this.prepareQuery(target, keys, query, context).getMany();
    }

    public oneToOne(entity: EntityMetadata, relation: RelationMetadata, root: ToolkitArgs, query: ToolkitQuery, context: ToolkitContext, info?: ToolkitInfo): Promise<object> {
        let target = relation.inverseEntityMetadata.name;
        let pks = relation.inverseEntityMetadata.primaryColumns.map(p => p.propertyName);
        let fks = relation.joinColumns.length ?
            relation.joinColumns.map(col => col.propertyName) :
            entity.primaryColumns.map(col => col.propertyName);
        let keys: any = {};
        pks.forEach((pk, i) => keys[pk] = root[fks[i]]);
        return this.prepareQuery(target, keys, query, context).getOne();
    }

    public manyToOne(entity: EntityMetadata, relation: RelationMetadata, root: ToolkitArgs, query: ToolkitQuery, context: ToolkitContext, info?: ToolkitInfo): Promise<object> {
        let target = relation.inverseEntityMetadata.name;
        let pks = relation.inverseEntityMetadata.primaryColumns.map(p => p.propertyName);
        let fks = relation.joinColumns.map(col => col.propertyName);
        let keys: any = {};
        pks.forEach((pk, i) => keys[pk] = root[fks[i]]);
        return this.prepareQuery(target, keys, query, context).getOne();
    }

    public prepareQuery(target: string, keys: ToolkitArgs, query: ToolkitQuery, context: ToolkitContext): SelectQueryBuilder<any> {
        let sql = ToolkitQuery.prepareSql(keys, query);
        let builder: SelectQueryBuilder<any> = this.manager.createQueryBuilder(target, ToolkitQuery.ALIAS)
            .where(sql.where, sql.params);
        sql.order.forEach(ord => builder.addOrderBy(ord.column, ord.asc ? "ASC" : "DESC"));
        if (sql.skip) builder.skip(sql.skip);
        if (sql.take) builder.take(sql.take);
        return builder;
    }
}


