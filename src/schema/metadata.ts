import { BooleanField, IntField, ListField, Metadata, RefField, StringField } from "../decorators/type";
import { ColumnType, IColumnMetadata } from "../metadata/column";
import { IEntityMetadata } from "../metadata/entity";
import { IRelationMetadata, RelationType } from "../metadata/relation";
import { Class } from "../types/core";

@Metadata()
export class ColumnMetadataType implements IColumnMetadata {
    @StringField() target: Class;
    @StringField() propertyName: string;
    @StringField() type: ColumnType;
    @IntField() precision?: number;
    @IntField() scale?: number;
    @StringField() length: string;
    @IntField() width?: number;
    @StringField() comment: string;
    @BooleanField() isPrimary: boolean;
    @BooleanField() isNullable: boolean;
    @BooleanField() isGenerated: boolean;
    @BooleanField() isCreateDate: boolean;
    @BooleanField() isUpdateDate: boolean;
    @BooleanField() isVersion: boolean;
    @BooleanField() isVirtual: boolean;
}

@Metadata()
export class RelationMetadataType implements IRelationMetadata<any> {
    @StringField() target: Class;
    // entityMetadata: EntityMetadataType;
    @StringField() propertyName: string;
    @StringField() relationType: RelationType;
    @RefField(type => EntityMetadataType) inverseEntityMetadata: IEntityMetadata;
    @RefField(type => RelationMetadataType) inverseRelation?: IRelationMetadata<any>;
    @ListField(type => ColumnMetadataType) joinColumns: IColumnMetadata[];
}

@Metadata()
export class EntityMetadataType implements IEntityMetadata {
    @StringField() target: Class;
    @StringField() name: string;
    @ListField(type => ColumnMetadataType) columns: IColumnMetadata[];
    @ListField(type => ColumnMetadataType) primaryColumns: IColumnMetadata[];
    @ListField(type => RelationMetadataType) relations: IRelationMetadata<any>[];
}