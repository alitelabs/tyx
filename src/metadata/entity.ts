import { Class, Prototype } from "../types/core";
import { ColumnMetadata } from "./column";
import { DatabaseMetadata } from "./database";
import { Registry } from "./registry";
import { RelationMetadata } from "./relation";

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

export interface EntityMetadata {
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
    columns: ColumnMetadata[];
    /**
     * Gets the primary columns.
     */
    primaryColumns: ColumnMetadata[];
    /**
     * Relations of the entity, including relations that are coming from the embeddeds of this entity.
     */
    relations: RelationMetadata<any>[];
}

export class EntityMetadata {
    public target: Class;
    public name: string;
    public columns: ColumnMetadata[] = [];
    public primaryColumns: ColumnMetadata[] = [];
    public relations: RelationMetadata<any>[] = [];
    public members: Record<string, (ColumnMetadata | RelationMetadata<any>)> = {};

    constructor(target: Class) {
        this.target = target;
        this.name = target.name;
    }

    public static has(target: Class | Prototype): boolean {
        return Reflect.hasMetadata(Registry.TYX_ENTITY, target)
            || Reflect.hasMetadata(Registry.TYX_ENTITY, target.constructor);
    }

    public static get(target: Class | Prototype): EntityMetadata {
        return Reflect.getMetadata(Registry.TYX_ENTITY, target)
            || Reflect.getMetadata(Registry.TYX_ENTITY, target.constructor);
    }

    public static define(target: Class): EntityMetadata {
        let meta = this.get(target);
        if (!meta) {
            meta = new EntityMetadata(target);
            Reflect.defineMetadata(Registry.TYX_ENTITY, meta, target);
        }
        return meta;
    }

    public addColumn(column: ColumnMetadata): this {
        if (!(this.members[column.propertyName])) this.columns.push(column);
        if (column.isPrimary) this.primaryColumns.push(column);
        this.members[column.propertyName] = column;
        return this;
    }

    public addRelation(relation: RelationMetadata<any>): this {
        if (!this.members[relation.propertyName]) this.relations.push(relation);
        this.members[relation.propertyName] = relation;
        return this;
    }

    public commit(options?: EntityOptions): void {
        if (options && options.name) this.name = options.name;
        Registry.entities[this.name] = this;
    }

    public resolve(database: DatabaseMetadata): void {
        this.columns.forEach(col => col.resolve(database, this));
        this.relations.forEach(rel => rel.resolve(database, this));
    }
}