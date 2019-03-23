// tslint:disable-next-line:import-name
import Lo = require('lodash');
import { Schema } from '../decorators/schema';
import { Field } from '../decorators/type';
import { IColumnMetadata } from '../metadata/column';
import { IEntityMetadata } from '../metadata/entity';
import { IDesignMetadata } from '../metadata/method';
import { IRelationMetadata, RelationType } from '../metadata/relation';
import { IVarMetadata, VarKind } from '../metadata/var';
import { Class, SchemaResolvers } from '../types/core';
import { Utils } from '../utils';
import { ColumnMetadataSchema } from './column';
import { EntityMetadataSchema } from './entity';
import { VarMetadataSchema } from './type';

@Schema()
export class RelationMetadataSchema implements IRelationMetadata<any> {
  @Field(String) kind: VarKind;
  @Field() name: string;
  @Field() required: boolean;
  @Field(item => VarMetadataSchema) item: IVarMetadata;
  @Field(Object) design: IDesignMetadata;
  @Field(ref => VarMetadataSchema) build: IVarMetadata;

  @Field(String) target: Class;
  @Field(ref => EntityMetadataSchema) entityMetadata: IEntityMetadata;
  @Field() propertyName: string;
  @Field(String) relationType: RelationType;
  @Field(ref => EntityMetadataSchema) inverseEntityMetadata: IEntityMetadata;
  @Field(ref => RelationMetadataSchema) inverseRelation?: IRelationMetadata<any>;
  @Field(list => [ColumnMetadataSchema]) joinColumns: IColumnMetadata[];

  public static RESOLVERS: SchemaResolvers<IRelationMetadata> = {
    target: obj => Utils.label(obj.target),
    joinColumns: (obj, args) => Lo.filter(obj.joinColumns, args),
  };
}
