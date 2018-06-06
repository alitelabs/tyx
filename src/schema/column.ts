import { Bool, Int, Metadata, Ref, Str } from "../decorators/type";
import { SchemaResolvers } from "../graphql/types";
import { ColumnType, IColumnMetadata } from "../metadata/column";
import { IEntityMetadata } from "../metadata/entity";
import { Class } from "../types/core";
import { EntityMetadataSchema } from "./entity";
import { Utils } from "../utils";

// @Enum(ColumnType)
export class ColumnTypeSchema {
}

@Metadata()
export class ColumnMetadataSchema implements IColumnMetadata {
    @Str() target: Class;
    @Ref(ref => EntityMetadataSchema) entityMetadata: IEntityMetadata;
    @Str() name: string;
    @Str() propertyName: string;
    @Str() type: ColumnType;
    @Int() precision?: number;
    @Int() scale?: number;
    @Str() length: string;
    @Int() width?: number;
    @Str() comment: string;
    @Bool() isPrimary: boolean;
    @Bool() isNullable: boolean;
    @Bool() isGenerated: boolean;
    @Bool() isCreateDate: boolean;
    @Bool() isUpdateDate: boolean;
    @Bool() isVersion: boolean;
    @Bool() isVirtual: boolean;

    public static RESOLVERS: SchemaResolvers<IColumnMetadata> = {
        target: (obj) => Utils.value(obj.target)
    };
}