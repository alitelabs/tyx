import * as Lo from "lodash";
import { List, Metadata, Ref, Str } from "../decorators/type";
import { SchemaResolvers } from "../graphql/types";
import { IColumnMetadata } from "../metadata/column";
import { IEntityMetadata } from "../metadata/entity";
import { IRelationMetadata, RelationType } from "../metadata/relation";
import { Class } from "../types/core";
import { ColumnMetadataSchema } from "./column";
import { EntityMetadataSchema } from "./entity";

@Metadata()
export class RelationMetadataSchema implements IRelationMetadata<any> {
    @Str() target: Class;
    @Ref(ref => EntityMetadataSchema) entityMetadata: IEntityMetadata;
    @Str() propertyName: string;
    @Str() relationType: RelationType;
    @Ref(ref => EntityMetadataSchema) inverseEntityMetadata: IEntityMetadata;
    @Ref(ref => RelationMetadataSchema) inverseRelation?: IRelationMetadata<any>;
    @List(item => ColumnMetadataSchema) joinColumns: IColumnMetadata[];

    public static RESOLVERS: SchemaResolvers<IRelationMetadata> = {
        target: (obj) => obj.target && `[class: ${obj.target.name}]`,
        joinColumns: (obj, args) => Lo.filter(obj.joinColumns, args)
    };
}