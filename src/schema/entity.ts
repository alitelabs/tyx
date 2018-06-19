// tslint:disable-next-line:import-name
import Lo = require('lodash');
import { Metadata } from '../decorators/schema';
import { Field } from '../decorators/type';
import { SchemaResolvers } from '../graphql/types';
import { IColumnMetadata } from '../metadata/column';
import { IEntityMetadata } from '../metadata/entity';
import { IRelationMetadata } from '../metadata/relation';
import { GraphKind, IFieldMetadata } from '../metadata/type';
import { Class } from '../types/core';
import { Utils } from '../utils';
import { ColumnMetadataSchema } from './column';
import { RelationMetadataSchema } from './relation';
import { FieldMetadataSchema } from './type';

@Metadata()
export class EntityMetadataSchema implements IEntityMetadata {
  @Field(String) kind: GraphKind;
  @Field(String) target: Class;
  @Field() name: string;
  @Field(list => [FieldMetadataSchema]) members: Record<string, IFieldMetadata>;
  @Field(list => [ColumnMetadataSchema]) columns: IColumnMetadata[];
  @Field(list => [ColumnMetadataSchema]) primaryColumns: IColumnMetadata[];
  @Field(list => [RelationMetadataSchema]) relations: IRelationMetadata[];

  public static RESOLVERS: SchemaResolvers<IEntityMetadata> = {
    target: obj => Utils.value(obj.target),
    members: (obj, args) => Lo.filter(Object.values(obj.members), args),
    columns: (obj, args) => Lo.filter(obj.columns, args),
    primaryColumns: (obj, args) => Lo.filter(obj.primaryColumns, args),
    relations: (obj, args) => Lo.filter(obj.relations, args),
  };
}
