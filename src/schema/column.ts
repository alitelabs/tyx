import { Metadata, QlBoolean, QlInt, QlRef, QlString } from "../decorators/type";
import { ResolverArgs } from "../graphql/types";
import { ColumnType, IColumnMetadata } from "../metadata/column";
import { IEntityMetadata } from "../metadata/entity";
import { Class } from "../types/core";
import { EntityMetadataSchema } from "./entity";

// @Enum(ColumnType)
export class ColumnTypeSchema {
}

@Metadata()
export class ColumnMetadataSchema implements IColumnMetadata {
    @QlString() target: Class;
    @QlRef(ref => EntityMetadataSchema) entityMetadata: IEntityMetadata;
    @QlString() propertyName: string;
    @QlString() type: ColumnType;
    @QlInt() precision?: number;
    @QlInt() scale?: number;
    @QlString() length: string;
    @QlInt() width?: number;
    @QlString() comment: string;
    @QlBoolean() isPrimary: boolean;
    @QlBoolean() isNullable: boolean;
    @QlBoolean() isGenerated: boolean;
    @QlBoolean() isCreateDate: boolean;
    @QlBoolean() isUpdateDate: boolean;
    @QlBoolean() isVersion: boolean;
    @QlBoolean() isVirtual: boolean;

    public static target(obj: IColumnMetadata, args: ResolverArgs): string {
        return obj.target && `[class: ${obj.target.name}]`;
    }
}