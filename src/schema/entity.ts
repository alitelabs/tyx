import Lo from "lodash";
import { Field, Metadata } from "../decorators/type";
import { SchemaResolvers } from "../graphql/types";
import { IColumnMetadata } from "../metadata/column";
import { IEntityMetadata } from "../metadata/entity";
import { IRelationMetadata } from "../metadata/relation";
import { Class } from "../types/core";
import { Utils } from "../utils";
import { ColumnMetadataSchema } from "./column";
import { RelationMetadataSchema } from "./relation";

@Metadata()
export class EntityMetadataSchema implements IEntityMetadata {
    @Field(String) target: Class;
    @Field(String) name: string;
    @Field(list => [ColumnMetadataSchema]) columns: IColumnMetadata[];
    @Field(list => [ColumnMetadataSchema]) primaryColumns: IColumnMetadata[];
    @Field(list => [RelationMetadataSchema]) relations: IRelationMetadata[];

    public static RESOLVERS: SchemaResolvers<IEntityMetadata> = {
        target: (obj) => Utils.value(obj.target),
        columns: (obj, args) => Lo.filter(obj.columns, args),
        primaryColumns: (obj, args) => Lo.filter(obj.primaryColumns, args),
        relations: (obj, args) => Lo.filter(obj.relations, args)
    };
}