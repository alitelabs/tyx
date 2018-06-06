import * as Lo from "lodash";
import { List, Metadata, Str } from "../decorators/type";
import { SchemaResolvers } from "../graphql/types";
import { IColumnMetadata } from "../metadata/column";
import { IDatabaseMetadata } from "../metadata/database";
import { IEntityMetadata } from "../metadata/entity";
import { IRelationMetadata } from "../metadata/relation";
import { GraphType } from "../metadata/type";
import { Class } from "../types/core";
import { ColumnMetadataSchema } from "./column";
import { EntityMetadataSchema } from "./entity";
import { RelationMetadataSchema } from "./relation";
import { Utils } from "../utils";

@Metadata()
export class DatabaseMetadataSchema implements IDatabaseMetadata {
    @Str() target: Class;
    @Str() alias: string;

    @List(GraphType.String) targets: Class[];
    @List(item => EntityMetadataSchema) entities: IEntityMetadata[];
    @List(item => ColumnMetadataSchema) columns: IColumnMetadata[];
    @List(item => RelationMetadataSchema) relations: IRelationMetadata<any>[];

    public static RESOLVERS: SchemaResolvers<IDatabaseMetadata> = {
        target: (obj) => Utils.value(obj.target),
        targets: (obj) => obj.targets && obj.targets.map(t => `[class: ${t.name}]`),
        entities: (obj, args) => Lo.filter(obj.entities, args),
        columns: (obj, args) => Lo.filter(obj.columns, args),
        relations: (obj, args) => Lo.filter(obj.relations, args)
    };
}