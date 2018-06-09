import { EntityManager, SelectQueryBuilder } from "../import/typeorm";
import { EntityMetadata } from "../metadata/entity";
import { RelationMetadata } from "../metadata/relation";
import { QueryToolkit } from "./query";
import { EntityResolver, ResolverArgs, ResolverContext, ResolverInfo, ResolverQuery } from "./types";

export interface IRecord {
    created: Date;
    updated: Date;
    version: number;
}

export class TypeOrmProvider implements EntityResolver {
    public static readonly LIMIT = 1000;

    protected manager: EntityManager;

    constructor(manager?: EntityManager) { this.manager = manager; }

    public get(entity: EntityMetadata, obj: ResolverArgs, args: ResolverArgs, context: ResolverContext, info?: ResolverInfo): Promise<any> {
        return this.prepareQuery(entity.name, args, null, context).getOne();
    }

    public search(entity: EntityMetadata, obj: ResolverArgs, args: ResolverQuery, context: ResolverContext, info?: ResolverInfo): Promise<any[]> {
        if (args.query) {
            args = { ...args.query, ...args };
            delete args.query;
        }
        return this.prepareQuery(entity.name, null, args, context).getMany();
    }

    public async create(entity: EntityMetadata, obj: ResolverArgs, args: ResolverArgs, context: ResolverContext, info?: ResolverInfo): Promise<any> {
        let record = this.manager.create<any>(entity.name, args);
        // let pks: Record<string, any> = {};
        // entity.primaryColumns.forEach(pk => pks[pk.name] = args[pk.name]);
        // TODO: Generate PK
        let result = await this.manager.insert(entity.name, record);
        return this.manager.findOne(entity.name, result.identifiers[0]);
    }

    public async update(entity: EntityMetadata, obj: ResolverArgs, args: ResolverArgs, context: ResolverContext, info?: ResolverInfo): Promise<any> {
        let record = this.manager.create(entity.name, args);
        let pks: Record<string, any> = {};
        entity.primaryColumns.forEach(pk => pks[pk.name] = args[pk.name]);
        // TODO: Generate PK
        await this.manager.update(entity.name, pks, record);
        return await this.manager.findOne(entity.name, pks);
    }

    public async remove(entity: EntityMetadata, obj: ResolverArgs, args: ResolverArgs, context: ResolverContext, info?: ResolverInfo): Promise<any> {
        let record = await this.manager.findOneOrFail(entity.name, args);
        await this.manager.remove(entity.name, args);
        return record;
    }

    public oneToMany(entity: EntityMetadata, relation: RelationMetadata, root: ResolverArgs, query: ResolverQuery, context?: ResolverContext, info?: ResolverInfo): Promise<object[]> {
        let target = relation.inverseEntityMetadata.name;
        let pks = entity.primaryColumns.map(col => col.propertyName);
        let fks = relation.inverseRelation.joinColumns.map(col => col.propertyName);
        let keys: any = {};
        fks.forEach((fk, i) => keys[fk] = root[pks[i]]);
        return this.prepareQuery(target, keys, query, context).getMany();
    }

    public oneToOne(entity: EntityMetadata, relation: RelationMetadata, root: ResolverArgs, query: ResolverQuery, context: ResolverContext, info?: ResolverInfo): Promise<object> {
        let target = relation.inverseEntityMetadata.name;
        let pks = relation.inverseEntityMetadata.primaryColumns.map(p => p.propertyName);
        let fks = relation.joinColumns.length ?
            relation.joinColumns.map(col => col.propertyName) :
            entity.primaryColumns.map(col => col.propertyName);
        let keys: any = {};
        pks.forEach((pk, i) => keys[pk] = root[fks[i]]);
        return this.prepareQuery(target, keys, query, context).getOne();
    }

    public manyToOne(entity: EntityMetadata, relation: RelationMetadata, root: ResolverArgs, query: ResolverQuery, context: ResolverContext, info?: ResolverInfo): Promise<object> {
        let target = relation.inverseEntityMetadata.name;
        let pks = relation.inverseEntityMetadata.primaryColumns.map(p => p.propertyName);
        let fks = relation.joinColumns.map(col => col.propertyName);
        let keys: any = {};
        pks.forEach((pk, i) => keys[pk] = root[fks[i]]);
        return this.prepareQuery(target, keys, query, context).getOne();
    }

    public prepareQuery(target: string, keys: ResolverArgs, query: ResolverQuery, context: ResolverContext): SelectQueryBuilder<any> {
        let sql = QueryToolkit.prepareSql(keys, query);
        let builder: SelectQueryBuilder<any> = this.manager.createQueryBuilder(target, QueryToolkit.ALIAS)
            .where(sql.where, sql.params);
        sql.order.forEach(ord => builder.addOrderBy(ord.column, ord.asc ? "ASC" : "DESC"));
        if (sql.skip) builder.skip(sql.skip);
        if (sql.take) builder.take(sql.take);
        return builder;
    }
}


