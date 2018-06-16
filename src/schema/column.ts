import { Field, Metadata } from '../decorators/type';
import { SchemaResolvers } from '../graphql/types';
import { ColumnType, IColumnMetadata } from '../metadata/column';
import { IEntityMetadata } from '../metadata/entity';
import { Int } from '../metadata/type';
import { Class } from '../types/core';
import { Utils } from '../utils';
import { EntityMetadataSchema } from './entity';

// @Enum(ColumnType)
export class ColumnTypeSchema {
}

@Metadata()
export class ColumnMetadataSchema implements IColumnMetadata {
  @Field(String) target: Class;
  @Field(ref => EntityMetadataSchema) entityMetadata: IEntityMetadata;
  @Field(String) name: string;
  @Field(String) propertyName: string;
  @Field(String) type: ColumnType;
  @Field(Int) precision?: number;
  @Field(Int) scale?: number;
  @Field(String) length: string;
  @Field(Int) width?: number;
  @Field(String) comment: string;
  @Field(Boolean) isPrimary: boolean;
  @Field(Boolean) isNullable: boolean;
  @Field(Boolean) isGenerated: boolean;
  @Field(Boolean) isCreateDate: boolean;
  @Field(Boolean) isUpdateDate: boolean;
  @Field(Boolean) isVersion: boolean;
  @Field(Boolean) isVirtual: boolean;

  public static RESOLVERS: SchemaResolvers<IColumnMetadata> = {
    target: obj => Utils.value(obj.target),
  };
}
