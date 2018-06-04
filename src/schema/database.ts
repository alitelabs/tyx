import * as Lo from "lodash";
import { List, Metadata, Str } from "../decorators/type";
import { ResolverArgs } from "../graphql/types";
import { IColumnMetadata } from "../metadata/column";
import { IDatabaseMetadata } from "../metadata/database";
import { IEntityMetadata } from "../metadata/entity";
import { IRelationMetadata } from "../metadata/relation";
import { GraphType } from "../metadata/type";
import { Class } from "../types/core";
import { ColumnMetadataSchema } from "./column";
import { EntityMetadataSchema } from "./entity";
import { RelationMetadataSchema } from "./relation";

@Metadata()
export class DatabaseMetadataSchema implements IDatabaseMetadata {
    @Str() target: Class;
    @Str() serviceId: string;

    @List(GraphType.String) targets: Class[];
    @List(item => EntityMetadataSchema) entities: IEntityMetadata[];
    @List(item => ColumnMetadataSchema) columns: IColumnMetadata[];
    @List(item => RelationMetadataSchema) relations: IRelationMetadata<any>[];

    public static target(obj: IDatabaseMetadata, args: ResolverArgs): string {
        return obj.target && `[class: ${obj.target.name}]`;
    }

    public static targets(obj: IDatabaseMetadata, args: ResolverArgs): string[] {
        return obj.targets && obj.targets.map(t => `[class: ${t.name}]`);
    }

    public static entities(obj: IDatabaseMetadata, args: ResolverArgs): IEntityMetadata[] {
        return Lo.filter(obj.entities, args);
    }

    public static columns(obj: IDatabaseMetadata, args: ResolverArgs): IColumnMetadata[] {
        return Lo.filter(obj.columns, args);
    }

    public static relations(obj: IDatabaseMetadata, args: ResolverArgs): IRelationMetadata<any>[] {
        return Lo.filter(obj.relations, args);
    }
}