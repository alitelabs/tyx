import { Metadata } from '../decorators/schema';
import { Field } from '../decorators/type';
import { SchemaResolvers } from '../graphql/types';
import { ColumnType, IColumnMetadata } from '../metadata/column';
import { IEntityMetadata } from '../metadata/entity';
import { DesignMetadata } from '../metadata/method';
import { GraphKind, IVarMetadata } from '../metadata/type';
import { Class } from '../types/core';
import { Utils } from '../utils';
import { EntityMetadataSchema } from './entity';
import { VarMetadataSchema } from './type';

// @Enum(ColumnType)
export class ColumnTypeSchema {
}

@Metadata()
export class ColumnMetadataSchema implements IColumnMetadata {
  @Field(String) kind: GraphKind;
  @Field() name: string;
  @Field() required: boolean;
  @Field(Object) design: DesignMetadata;
  @Field(ref => VarMetadataSchema) build: IVarMetadata;

  @Field(String) target: Class;
  @Field(ref => EntityMetadataSchema) entityMetadata: IEntityMetadata;
  @Field() propertyName: string;
  @Field(String) type: ColumnType;
  @Field(0) precision?: number;
  @Field(0) scale?: number;
  @Field() length: string;
  @Field(0) width?: number;
  @Field() comment: string;
  @Field() isPrimary: boolean;
  @Field() isNullable: boolean;
  @Field() isGenerated: boolean;
  @Field() isCreateDate: boolean;
  @Field() isUpdateDate: boolean;
  @Field() isVersion: boolean;
  @Field() isVirtual: boolean;

  public static RESOLVERS: SchemaResolvers<IColumnMetadata> = {
    target: obj => Utils.value(obj.target),
  };
}
