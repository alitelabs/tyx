import { Orm } from "../import";
import { Metadata } from "../metadata/common";
import { DatabaseMetadata } from "../metadata/database";
import { EntityMetadata } from "../metadata/entity";
import { Class } from "../types";

export const Database = "database";
export interface Database {
    manager: Orm.EntityManager;
    metadata: EntityMetadata[];
}

export function DatabaseService(entities: Class[]): ClassDecorator;
export function DatabaseService(alias: string, entities: Class[]): ClassDecorator;
export function DatabaseService(aliasOrEntities: string | Class[], entities?: Class[]): ClassDecorator {
    let alias = typeof aliasOrEntities === "string" ? aliasOrEntities : "database";
    entities = Array.isArray(aliasOrEntities) ? aliasOrEntities : entities;
    return (target) => {
        Metadata.trace(Database, { alias, entities }, target);
        DatabaseMetadata.define(target).commit(alias, entities);
    };
}