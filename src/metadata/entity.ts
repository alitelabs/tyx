import { Class, Prototype } from '../types/core';
import { Utils } from '../utils';
import { ColumnMetadata, IColumnMetadata } from './column';
import { DatabaseMetadata, IDatabaseMetadata } from './database';
import { Metadata } from './registry';
import { IRelationMetadata, RelationMetadata } from './relation';
import { GraphKind, ITypeMetadata, TypeMetadata } from './type';

export interface EntityOptions {
  /**
   * Table name.
   * If not specified then naming strategy will generate table name from entity name.
   */
  name?: string;
  /**
   * Table's database engine type (like "InnoDB", "MyISAM", etc).
   * It is used only during table creation.
   * If you update this value and table is already created, it will not change table's engine type.
   * Note that not all databases support this option.
   */
  // engine?: string;
  /**
   * Database name. Used in Mysql and Sql Server.
   */
  database?: string;
  /**
   * Schema name. Used in Postgres and Sql Server.
   */
  // schema?: string;
  /**
   * Indicates if schema synchronization is enabled or disabled for this entity.
   * If it will be set to false then schema sync will and migrations ignore this entity.
   * By default schema synchronization is enabled for all entities.
   */
  synchronize?: boolean;
}

export interface IEntityMetadata extends ITypeMetadata {
  database: IDatabaseMetadata;
  target: Class;
  /**
   * Entity's name.
   * Equal to entity target class's name if target is set to table.
   * If target class is not then then it equals to table name.
   */
  name: string;
  /**
   * Columns of the entity, including columns that are coming from the embeddeds of this entity.
   */
  columns: IColumnMetadata[];
  /**
   * Gets the primary columns.
   */
  primaryColumns: IColumnMetadata[];
  /**
   * Relations of the entity, including relations that are coming from the embeddeds of this entity.
   */
  relations: IRelationMetadata<any>[];
}

export class EntityMetadata extends TypeMetadata implements IEntityMetadata {
  public database: DatabaseMetadata = null;
  public columns: ColumnMetadata[] = [];
  public primaryColumns: ColumnMetadata[] = [];
  public relations: RelationMetadata<any>[] = [];

  constructor(target: Class) {
    super(target);
  }

  public static has(target: Class | Prototype): boolean {
    return Reflect.hasOwnMetadata(Metadata.TYX_ENTITY, target)
      || Reflect.hasOwnMetadata(Metadata.TYX_ENTITY, target.constructor);
  }

  public static get(target: Class | Prototype): EntityMetadata {
    return Reflect.getOwnMetadata(Metadata.TYX_ENTITY, target)
      || Reflect.getOwnMetadata(Metadata.TYX_ENTITY, target.constructor);
  }

  public static define(target: Class): EntityMetadata {
    if (!Utils.isClass(target)) throw new TypeError('Not a class');
    if (Utils.baseClass(target) !== Object) throw new TypeError('Inheritance not supported');
    let meta = this.get(target);
    if (meta) return meta;
    meta = new EntityMetadata(target);
    Reflect.defineMetadata(Metadata.TYX_TYPE, meta, target);
    Reflect.defineMetadata(Metadata.TYX_ENTITY, meta, target);
    return meta;
  }

  public addColumn(column: ColumnMetadata): this {
    this.members = this.members || {};
    if (!(this.members[column.propertyName])) this.columns.push(column);
    if (column.isPrimary) this.primaryColumns.push(column);
    this.members[column.propertyName] = column;
    return this;
  }

  public addRelation(relation: RelationMetadata<any>): this {
    this.members = this.members || {};
    if (!this.members[relation.propertyName]) this.relations.push(relation);
    this.members[relation.propertyName] = relation;
    return this;
  }

  public submit(options?: EntityOptions): this {
    if (options && options.name) this.name = options.name;
    super.commit(GraphKind.Entity, this.name);
    return this;
  }

  public resolve(database: DatabaseMetadata): void {
    this.database = database;
    this.columns.forEach(col => col.resolve(database, this));
    this.relations.forEach(rel => rel.resolve(database, this));
  }
}
