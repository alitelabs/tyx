// tslint:disable-next-line:import-name
import Lo = require('lodash');
import { Field, Metadata } from '../decorators/type';
import { SchemaResolvers } from '../graphql/types';
import { IColumnMetadata } from '../metadata/column';
import { IEntityMetadata } from '../metadata/entity';
import { DesignMetadata } from '../metadata/method';
import { IRelationMetadata, RelationType } from '../metadata/relation';
import { GraphKind, VarMetadata } from '../metadata/type';
import { Class } from '../types/core';
import { Utils } from '../utils';
import { ColumnMetadataSchema } from './column';
import { EntityMetadataSchema } from './entity';
import { VarMetadataSchema } from './type';

@Metadata()
export class RelationMetadataSchema implements IRelationMetadata<any> {
  @Field(String) kind: GraphKind;
  @Field(String) name: string;
  @Field(Boolean) required: boolean;
  @Field(item => VarMetadataSchema) item: VarMetadata;
  @Field(Object) design: DesignMetadata;
  @Field(ref => VarMetadataSchema) build: VarMetadata;

  @Field(String) target: Class;
  @Field(ref => EntityMetadataSchema) entityMetadata: IEntityMetadata;
  @Field(String) propertyName: string;
  @Field(String) relationType: RelationType;
  @Field(ref => EntityMetadataSchema) inverseEntityMetadata: IEntityMetadata;
  @Field(ref => RelationMetadataSchema) inverseRelation?: IRelationMetadata<any>;
  @Field(list => [ColumnMetadataSchema]) joinColumns: IColumnMetadata[];

  public static RESOLVERS: SchemaResolvers<IRelationMetadata> = {
    target: obj => Utils.value(obj.target),
    joinColumns: (obj, args) => Lo.filter(obj.joinColumns, args),
  };
}
