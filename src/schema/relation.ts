import * as Lo from "lodash";
import { QlArray, Metadata, QlRef, QlString } from "../decorators/type";
import { ResolverArgs } from "../graphql/types";
import { IColumnMetadata } from "../metadata/column";
import { IEntityMetadata } from "../metadata/entity";
import { IRelationMetadata, RelationType } from "../metadata/relation";
import { Class } from "../types/core";
import { ColumnMetadataSchema } from "./column";
import { EntityMetadataSchema } from "./entity";

@Metadata()
export class RelationMetadataSchema implements IRelationMetadata<any> {
    @QlString() target: Class;
    @QlRef(ref => EntityMetadataSchema) entityMetadata: IEntityMetadata;
    @QlString() propertyName: string;
    @QlString() relationType: RelationType;
    @QlRef(ref => EntityMetadataSchema) inverseEntityMetadata: IEntityMetadata;
    @QlRef(ref => RelationMetadataSchema) inverseRelation?: IRelationMetadata<any>;
    @QlArray(item => ColumnMetadataSchema) joinColumns: IColumnMetadata[];

    public static target(obj: IRelationMetadata, args: ResolverArgs): string {
        return obj.target && `[class: ${obj.target.name}]`;
    }

    public static joinColumns(obj: IRelationMetadata, args: ResolverArgs): IColumnMetadata[] {
        return Lo.filter(obj.joinColumns, args);
    }
}