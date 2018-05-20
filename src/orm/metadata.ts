import * as Orm from "typeorm";
import { ColumnMetadata as OrmColumnMetadata } from "typeorm/metadata/ColumnMetadata";
import { RelationMetadata as OrmRelationMetadata } from "typeorm/metadata/RelationMetadata";

export interface EntityMetadata extends Orm.EntityMetadata { }

export interface ColumnMetadata extends OrmColumnMetadata { }

export interface RelationMetadata extends OrmRelationMetadata { }