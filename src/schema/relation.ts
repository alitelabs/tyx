import { Schema } from '../decorators/schema';
import { Field } from '../decorators/type';
import { IColumnMetadata } from '../metadata/column';
import { IEntityMetadata } from '../metadata/entity';
import { IDesignMetadata } from '../metadata/field';
import { IRelationMetadata, RelationType } from '../metadata/relation';
import { IVarMetadata, IVarResolution, VarKind, VarRole } from '../metadata/var';
import { Class, SchemaResolvers } from '../types/core';
import { ColumnMetadataSchema } from './column';
import { EntityMetadataSchema } from './entity';
import { Lodash } from './lodash';
import { VarMetadataSchema, VarResolutionSchema } from './type';

@Schema()
export class RelationMetadataSchema implements IRelationMetadata<any> {
  @Field(String) kind: VarKind;
  @Field() name: string;
  @Field(String) role: VarRole;
  @Field() mandatory: boolean;
  @Field(Object) design: IDesignMetadata;
  @Field(item => VarMetadataSchema) item: IVarMetadata;
  @Field(ref => VarResolutionSchema) res: IVarResolution;

  @Field(String) target: Class;
  @Field(ref => EntityMetadataSchema) entityMetadata: IEntityMetadata;
  @Field() propertyName: string;
  @Field(String) relationType: RelationType;
  @Field(ref => EntityMetadataSchema) inverseEntityMetadata: IEntityMetadata;
  @Field(ref => RelationMetadataSchema) inverseRelation?: IRelationMetadata<any>;
  @Field(list => [ColumnMetadataSchema]) joinColumns: IColumnMetadata[];

  public static RESOLVERS: SchemaResolvers<IRelationMetadata> = {
    target: obj => Lodash.label(obj.target),
    joinColumns: (obj, args) => Lodash.filter(obj.joinColumns, args),
  };
}
