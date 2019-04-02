import { Schema } from '../decorators/schema';
import { Field } from '../decorators/type';
import { ColumnType, IColumnMetadata } from '../metadata/column';
import { IEntityMetadata } from '../metadata/entity';
import { IDesignMetadata } from '../metadata/field';
import { IVarResolution, VarKind } from '../metadata/var';
import { Class, SchemaResolvers } from '../types/core';
import { Utils } from '../utils';
import { EntityMetadataSchema } from './entity';
import { VarResolutionSchema } from './type';

// @Enum(ColumnType)
export class ColumnTypeSchema {
}

@Schema()
export class ColumnMetadataSchema implements IColumnMetadata {
  @Field(String) kind: VarKind;
  @Field() name: string;
  @Field() mandatory: boolean;
  @Field(Object) design: IDesignMetadata;
  @Field(ref => VarResolutionSchema) res: IVarResolution;

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

  @Field() isTransient: boolean;
  @Field() generateStrategy: 'increment' | 'uuid';

  public static RESOLVERS: SchemaResolvers<IColumnMetadata> = {
    target: obj => Utils.label(obj.target),
  };
}
