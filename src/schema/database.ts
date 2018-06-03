import * as Lo from "lodash";
import { ListField, Metadata, StringField } from "../decorators/type";
import { ResolverArgs } from "../graphql/types";
import { IColumnMetadata } from "../metadata/column";
import { IDatabaseMetadata } from "../metadata/database";
import { IEntityMetadata } from "../metadata/entity";
import { MetadataRegistry } from "../metadata/registry";
import { IRelationMetadata } from "../metadata/relation";
import { GraphType } from "../metadata/type";
import { Class } from "../types/core";
import { ColumnMetadataType, EntityMetadataType, RelationMetadataType } from "./metadata";

@Metadata()
export class DatabaseMetadataType implements IDatabaseMetadata {
    @StringField() target: Class;
    @StringField() serviceId: string;

    @ListField(GraphType.String) targets: Class[];
    @ListField(type => EntityMetadataType) entities: IEntityMetadata[];
    @ListField(type => ColumnMetadataType) columns: IColumnMetadata[];
    @ListField(type => RelationMetadataType) relations: IRelationMetadata<any>[];

    public static registry(root: MetadataRegistry, args: ResolverArgs): IDatabaseMetadata[] {
        return Lo.filter(Object.values(root.databases), args);
    }

    public static target(parent: IDatabaseMetadata, args: ResolverArgs): string {
        return parent.target && `[class: ${parent.target.name}]`;
    }

    public static targets(parent: IDatabaseMetadata, args: ResolverArgs): string[] {
        return parent.targets && parent.targets.map(t => `[class: ${t.name}]`);
    }

    public static entities(parent: IDatabaseMetadata, args: ResolverArgs): IEntityMetadata[] {
        return Lo.filter(parent.entities, args);
    }

    public static columns(parent: IDatabaseMetadata, args: ResolverArgs): IColumnMetadata[] {
        return Lo.filter(parent.columns, args);
    }

    public static relations(parent: IDatabaseMetadata, args: ResolverArgs): IRelationMetadata<any>[] {
        return Lo.filter(parent.relations, args);
    }
}