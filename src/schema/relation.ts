import Lo from "lodash";
import { Field, Metadata } from "../decorators/type";
import { SchemaResolvers } from "../graphql/types";
import { IColumnMetadata } from "../metadata/column";
import { IEntityMetadata } from "../metadata/entity";
import { IRelationMetadata, RelationType } from "../metadata/relation";
import { Class } from "../types/core";
import { Utils } from "../utils";
import { ColumnMetadataSchema } from "./column";
import { EntityMetadataSchema } from "./entity";

@Metadata()
export class RelationMetadataSchema implements IRelationMetadata<any> {
    @Field(String) target: Class;
    @Field(ref => EntityMetadataSchema) entityMetadata: IEntityMetadata;
    @Field(String) propertyName: string;
    @Field(String) relationType: RelationType;
    @Field(ref => EntityMetadataSchema) inverseEntityMetadata: IEntityMetadata;
    @Field(ref => RelationMetadataSchema) inverseRelation?: IRelationMetadata<any>;
    @Field(list => [ColumnMetadataSchema]) joinColumns: IColumnMetadata[];

    public static RESOLVERS: SchemaResolvers<IRelationMetadata> = {
        target: (obj) => Utils.value(obj.target),
        joinColumns: (obj, args) => Lo.filter(obj.joinColumns, args)
    };
}