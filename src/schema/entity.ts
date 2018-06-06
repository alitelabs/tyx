import * as Lo from "lodash";
import { List, Metadata, Str } from "../decorators/type";
import { SchemaResolvers } from "../graphql/types";
import { IColumnMetadata } from "../metadata/column";
import { IEntityMetadata } from "../metadata/entity";
import { IRelationMetadata } from "../metadata/relation";
import { Class } from "../types/core";
import { ColumnMetadataSchema } from "./column";
import { RelationMetadataSchema } from "./relation";
import { Utils } from "../utils";

@Metadata()
export class EntityMetadataSchema implements IEntityMetadata {
    @Str() target: Class;
    @Str() name: string;
    @List(item => ColumnMetadataSchema) columns: IColumnMetadata[];
    @List(item => ColumnMetadataSchema) primaryColumns: IColumnMetadata[];
    @List(item => RelationMetadataSchema) relations: IRelationMetadata[];

    public static RESOLVERS: SchemaResolvers<IEntityMetadata> = {
        target: (obj) => Utils.value(obj.target),
        columns: (obj, args) => Lo.filter(obj.columns, args),
        primaryColumns: (obj, args) => Lo.filter(obj.primaryColumns, args),
        relations: (obj, args) => Lo.filter(obj.relations, args)
    };
}