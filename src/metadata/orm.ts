import { Orm } from "../import";
import { EntityMetadata } from "./entity";

export const Database = "database";
export interface Database {
    manager: Orm.EntityManager;
    metadata: EntityMetadata[];
}