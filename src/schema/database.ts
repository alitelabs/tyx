import * as Lo from "lodash";
import { QlArray, Metadata, QlString } from "../decorators/type";
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
    @QlString() target: Class;
    @QlString() serviceId: string;

    @QlArray(GraphType.String) targets: Class[];
    @QlArray(item => EntityMetadataSchema) entities: IEntityMetadata[];
    @QlArray(item => ColumnMetadataSchema) columns: IColumnMetadata[];
    @QlArray(item => RelationMetadataSchema) relations: IRelationMetadata<any>[];

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