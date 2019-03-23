import { NotImplemented } from '../errors';
import { TypeOrm } from '../import/typeorm';
import { DatabaseMetadata } from '../metadata/database';
import { EntityMetadata } from '../metadata/entity';
import { RelationMetadata } from '../metadata/relation';
import { Context, EntityResolver, ResolverArgs, ResolverInfo, ResolverQuery } from '../types/core';
import { QueryToolkit } from './query';

export interface IRecord {
  created: Date;
  updated: Date;
  version: number;
}

export class TypeOrmProvider implements EntityResolver {
  public static readonly LIMIT = 1000;

  protected manager: TypeOrm.EntityManager;

  constructor(manager?: TypeOrm.EntityManager) { this.manager = manager; }

  public get metadata() {
    return DatabaseMetadata.get(this) as any;
  }

  public get(entity: EntityMetadata, obj: ResolverArgs, args: ResolverArgs, context: Context, info?: ResolverInfo): Promise<any> {
    return this.prepareQuery(entity.name, args, null, context).getOne();
  }

  public search(
    entity: EntityMetadata,
    obj: ResolverArgs,
    args: ResolverQuery,
    ctx: Context,
    info?: ResolverInfo
  ): Promise<any[]> {
    let query = args;
    if (query.query) {
      query = { ...args.query, ...args };
      delete query.query;
    }
    return this.prepareQuery(entity.name, null, query, ctx).getMany();
  }

  public async create(
    entity: EntityMetadata,
    obj: ResolverArgs,
    args: ResolverArgs,
    ctx: Context,
    info?: ResolverInfo
  ): Promise<any> {
    const record = this.manager.create<any>(entity.name, args);
    // let pks: Record<string, any> = {};
    // entity.primaryColumns.forEach(pk => pks[pk.name] = args[pk.name]);
    // TODO: Generate PK
    const result = await this.manager.insert(entity.name, record);
    return this.manager.findOne(entity.name, result.identifiers[0]);
  }

  public async update(
    entity: EntityMetadata,
    obj: ResolverArgs,
    args: ResolverArgs,
    ctx: Context,
    info?: ResolverInfo
  ): Promise<any> {
    const record = this.manager.create(entity.name, args);
    const pks: Record<string, any> = {};
    entity.primaryColumns.forEach(pk => pks[pk.name] = args[pk.name]);
    // TODO: Generate PK
    await this.manager.update(entity.name, pks, record);
    return await this.manager.findOne(entity.name, pks);
  }

  public async remove(
    entity: EntityMetadata,
    obj: ResolverArgs,
    args: ResolverArgs,
    ctx: Context,
    info?: ResolverInfo
  ): Promise<any> {
    const record = await this.manager.findOneOrFail(entity.name, args);
    await this.manager.remove(entity.name, args);
    return record;
  }

  public oneToMany(
    entity: EntityMetadata,
    relation: RelationMetadata,
    root: ResolverArgs,
    query: ResolverQuery,
    ctx?: Context,
    info?: ResolverInfo
  ): Promise<object[]> {
    const target = relation.inverseEntityMetadata.name;
    const pks = entity.primaryColumns.map(col => col.propertyName);
    const fks = relation.inverseRelation.joinColumns.map(col => col.propertyName);
    const keys: any = {};
    fks.forEach((fk, i) => keys[fk] = root[pks[i]]);
    return this.prepareQuery(target, keys, query, ctx).getMany();
  }

  public oneToOne(
    entity: EntityMetadata,
    relation: RelationMetadata,
    root: ResolverArgs,
    query: ResolverQuery,
    ctx: Context,
    info?: ResolverInfo
  ): Promise<object> {
    const target = relation.inverseEntityMetadata.name;
    const pks = relation.inverseEntityMetadata.primaryColumns.map(p => p.propertyName);
    const fks = relation.joinColumns.length ?
      relation.joinColumns.map(col => col.propertyName) :
      entity.primaryColumns.map(col => col.propertyName);
    const keys: any = {};
    pks.forEach((pk, i) => keys[pk] = root[fks[i]]);
    return this.prepareQuery(target, keys, query, ctx).getOne();
  }

  public manyToOne(
    entity: EntityMetadata,
    relation: RelationMetadata,
    root: ResolverArgs,
    query: ResolverQuery,
    ctx: Context,
    info?: ResolverInfo
  ): Promise<object> {
    const target = relation.inverseEntityMetadata.name;
    const pks = relation.inverseEntityMetadata.primaryColumns.map(p => p.propertyName);
    const fks = relation.joinColumns.map(col => col.propertyName);
    const keys: any = {};
    pks.forEach((pk, i) => keys[pk] = root[fks[i]]);
    return this.prepareQuery(target, keys, query, ctx).getOne();
  }

  public manyToMany(
    entity: EntityMetadata,
    relation: RelationMetadata,
    root: ResolverArgs,
    query: ResolverQuery,
    ctx: Context,
    info?: ResolverInfo
  ): Promise<object> {
    throw new NotImplemented('manyToMany not implemented');
  }

  public prepareQuery(
    target: string,
    keys: ResolverArgs,
    query: ResolverQuery,
    ctx: Context
  ): TypeOrm.SelectQueryBuilder<any> {
    const sql = QueryToolkit.prepareSql(keys, query);
    const builder: TypeOrm.SelectQueryBuilder<any> = this.manager.createQueryBuilder(target, QueryToolkit.ALIAS)
      .where(sql.where, sql.params);
    sql.order.forEach(ord => builder.addOrderBy(ord.column, ord.asc ? 'ASC' : 'DESC'));
    if (sql.skip) builder.skip(sql.skip);
    if (sql.take) builder.take(sql.take);
    return builder;
  }
}
