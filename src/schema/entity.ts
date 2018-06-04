import * as Lo from "lodash";
import { List, Metadata, Str } from "../decorators/type";
import { ResolverArgs } from "../graphql/types";
import { IColumnMetadata } from "../metadata/column";
import { IEntityMetadata } from "../metadata/entity";
import { IRelationMetadata } from "../metadata/relation";
import { Class } from "../types/core";
import { ColumnMetadataSchema } from "./column";
import { RelationMetadataSchema } from "./relation";

@Metadata()
export class EntityMetadataSchema implements IEntityMetadata {
    @Str() target: Class;
    @Str() name: string;
    @List(item => ColumnMetadataSchema) columns: IColumnMetadata[];
    @List(item => ColumnMetadataSchema) primaryColumns: IColumnMetadata[];
    @List(item => RelationMetadataSchema) relations: IRelationMetadata[];

    public static target(obj: IEntityMetadata, args: ResolverArgs): string {
        return obj.target && `[class: ${obj.target.name}]`;
    }

    public static columns(obj: IEntityMetadata, args: ResolverArgs): IColumnMetadata[] {
        return Lo.filter(obj.columns, args);
    }

    public static primaryColumns(obj: IEntityMetadata, args: ResolverArgs): IColumnMetadata[] {
        return Lo.filter(obj.primaryColumns, args);
    }

    public static relations(obj: IEntityMetadata, args: ResolverArgs): IRelationMetadata[] {
        return Lo.filter(obj.relations, args);
    }
}