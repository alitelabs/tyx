// tslint:disable-next-line:import-name
import Lo from 'lodash';
import { Field, Metadata } from '../decorators/type';
import { SchemaResolvers } from '../graphql';
import { DesignMetadata } from '../metadata/method';
import { GraphKind, IEnumMetadata, IFieldMetadata, ITypeMetadata, VarMetadata } from '../metadata/type';
import { Class } from '../types/core';
import { Utils } from '../utils';

@Metadata()
export class VarMetadataSchema implements VarMetadata {
  @Field(String) ref?: Class;
  @Field(String) kind: GraphKind;
  @Field(type => VarMetadataSchema) item?: VarMetadata;

  public static RESOLVERS: SchemaResolvers<VarMetadata> = {
    ref: obj => Utils.value(obj.ref),
  };
}

@Metadata()
export class EnumMetadataSchema implements IEnumMetadata {
  @Field(String) kind: GraphKind;
  @Field(String) name: string;
  @Field(String) ref: any;
  @Field([String]) options: string[];

  public static RESOLVERS: SchemaResolvers<IEnumMetadata> = {
    ref: obj => Utils.value(obj.ref),
  };
}

@Metadata()
export class FieldMetadataSchema implements IFieldMetadata {
  @Field(String) kind: GraphKind;
  @Field(String) name: string;
  @Field(Boolean) required: boolean;
  @Field(Object) design: DesignMetadata;
  @Field(ref => VarMetadataSchema) build: VarMetadata;
  @Field(String) ref?: Class;
  @Field(ref => VarMetadataSchema) item?: VarMetadata;

  public static RESOLVERS: SchemaResolvers<IFieldMetadata> = {
    ref: obj => Utils.value(obj.ref),
  };
}

@Metadata()
export class TypeMetadataSchema implements ITypeMetadata {
  @Field(String) kind: GraphKind;
  @Field(String) name: string;
  @Field(String) target: Class;
  @Field(list => [FieldMetadataSchema]) members: Record<string, IFieldMetadata>;

  public static RESOLVERS: SchemaResolvers<ITypeMetadata> = {
    target: obj => Utils.value(obj.target),
    members: (obj, args) => Lo.filter(Object.values(obj.members), args),
  };
}
