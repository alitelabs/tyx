import { Schema } from '../decorators/schema';
import { Field } from '../decorators/type';
import { IColumnMetadata } from '../metadata/column';
import { IDatabaseMetadata } from '../metadata/database';
import { IEntityMetadata } from '../metadata/entity';
import { IFieldMetadata } from '../metadata/field';
import { IRelationMetadata } from '../metadata/relation';
import { VarKind } from '../metadata/var';
import { Class, SchemaResolvers } from '../types/core';
import { ColumnMetadataSchema } from './column';
import { DatabaseMetadataSchema } from './database';
import { Lodash } from './lodash';
import { RelationMetadataSchema } from './relation';
import { FieldMetadataSchema } from './type';

@Schema()
export class EntityMetadataSchema implements IEntityMetadata {
  @Field(String) kind: VarKind;
  @Field(String) target: Class;
  @Field() name: string;
  @Field(ref => DatabaseMetadataSchema) database: IDatabaseMetadata;
  @Field(list => [FieldMetadataSchema]) members: Record<string, IFieldMetadata>;
  @Field(list => [ColumnMetadataSchema]) columns: IColumnMetadata[];
  @Field(list => [ColumnMetadataSchema]) primaryColumns: IColumnMetadata[];
  @Field(list => [RelationMetadataSchema]) relations: IRelationMetadata[];

  public static RESOLVERS: SchemaResolvers<IEntityMetadata> = {
    target: obj => Lodash.label(obj.target),
    members: (obj, args) => Lodash.filter(obj.members, args),
    columns: (obj, args) => Lodash.filter(obj.columns, args),
    primaryColumns: (obj, args) => Lodash.filter(obj.primaryColumns, args),
    relations: (obj, args) => Lodash.filter(obj.relations, args),
  };
}
