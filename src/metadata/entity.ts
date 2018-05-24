import { Orm } from "../import";
import { ObjectType } from "../types";
import { ColumnMetadata } from "./column";
import { META_TYX_ENTITIES } from "./common";
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

export function Entity<TFunction extends Function>(database?: TFunction, options?: EntityOptions): ClassDecorator {
    return (target) => {
        if (database) {
            if (!Reflect.hasMetadata(META_TYX_ENTITIES, database)) Reflect.defineMetadata(META_TYX_ENTITIES, [], database);
            Reflect.getMetadata(META_TYX_ENTITIES, database).push(target);
        }
        Orm.Entity(options)(target);
    };
}

export namespace Entity {
    export function list(database: Object): ObjectType<any>[] {
        return Reflect.getMetadata(META_TYX_ENTITIES, database)
            || Reflect.getMetadata(META_TYX_ENTITIES, database.constructor);
    }
}

export interface EntityMetadata {
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
    relations: RelationMetadata[];
}