import { Schema } from '../decorators/schema';
import { Field } from '../decorators/type';
import { IColumnMetadata } from '../metadata/column';
import { IDatabaseMetadata } from '../metadata/database';
import { IEntityMetadata } from '../metadata/entity';
import { IRelationMetadata } from '../metadata/relation';
import { IServiceMetadata } from '../metadata/service';
import { Class, SchemaResolvers } from '../types/core';
import { ColumnMetadataSchema } from './column';
import { EntityMetadataSchema } from './entity';
import { Lodash } from './lodash';
import { RelationMetadataSchema } from './relation';
import { ServiceMetadataSchema } from './service';

@Schema()
export class DatabaseMetadataSchema implements IDatabaseMetadata {
  @Field(String) target: Class;
  @Field() alias: string;
  @Field(ref => ServiceMetadataSchema) servicer: IServiceMetadata;

  @Field([String]) targets: Class[];
  @Field(list => [EntityMetadataSchema]) entities: IEntityMetadata[];
  @Field(list => [ColumnMetadataSchema]) columns: IColumnMetadata[];
  @Field(list => [RelationMetadataSchema]) relations: IRelationMetadata<any>[];

  public static RESOLVERS: SchemaResolvers<IDatabaseMetadata> = {
    target: obj => Lodash.label(obj.target),
    targets: obj => obj.targets && obj.targets.map(t => `[class: ${t.name}]`),
    entities: (obj, args) => Lodash.filter(obj.entities, args),
    columns: (obj, args) => Lodash.filter(obj.columns, args),
    relations: (obj, args) => Lodash.filter(obj.relations, args),
  };
}
