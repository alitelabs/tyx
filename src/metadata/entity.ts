import { Class, Prototype } from "../types";
import { ColumnMetadata } from "./column";
import { Metadata } from "./core";
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

export namespace EntityMetadata {
    export function has(target: Class | Prototype): boolean {
        return Reflect.hasMetadata(Metadata.TYX_ENTITY, target)
            || Reflect.hasMetadata(Metadata.TYX_ENTITY, target.constructor);
    }

    export function get(target: Class | Prototype): EntityMetadata {
        return Reflect.getMetadata(Metadata.TYX_ENTITY, target)
            || Reflect.getMetadata(Metadata.TYX_ENTITY, target.constructor);
    }

    export function init(target: Class): EntityMetadata {
        let meta = get(target);
        if (!meta) {
            meta = {
                name: undefined,
                columns: [],
                primaryColumns: [],
                relations: []
            };
            Reflect.defineMetadata(Metadata.TYX_ENTITY, meta, target);
        }
        return meta;
    }

    export function define(target: Class, options?: EntityOptions): EntityMetadata {
        let meta = init(target);
        if (options && options.name) meta.name = options.name;
        if (!meta.name) meta.name = target.name;
        return meta;
    }
}