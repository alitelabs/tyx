// tslint:disable-next-line:import-name
import Lo = require('lodash');
import { Schema } from '../decorators/schema';
import { Field } from '../decorators/type';
import { SchemaResolvers } from '../graphql/types';
import { DesignMetadata } from '../metadata/method';
import { GraphKind, IEnumMetadata, IFieldMetadata, IInputMetadata, IResultMetadata, ITypeMetadata, IVarMetadata } from '../metadata/type';
import { Class } from '../types/core';
import { Utils } from '../utils';

@Schema()
export class VarMetadataSchema implements IVarMetadata {
  @Field(String) ref?: Class;
  @Field(String) kind: GraphKind;
  @Field(type => VarMetadataSchema) item?: IVarMetadata;

  public static RESOLVERS: SchemaResolvers<IVarMetadata> = {
    ref: obj => Utils.value(obj.ref),
  };
}

@Schema()
export class InputMetadataSchema implements IInputMetadata {
  @Field(String) ref?: Class;
  @Field(String) kind: GraphKind;
  @Field(type => VarMetadataSchema) build: IVarMetadata;
  @Field(type => VarMetadataSchema) item?: IVarMetadata;

  public static RESOLVERS: SchemaResolvers<IVarMetadata> = {
    ref: obj => Utils.value(obj.ref),
  };
}

@Schema()
export class ResultMetadataSchema implements IResultMetadata {
  @Field(String) ref?: Class;
  @Field(String) kind: GraphKind;
  @Field(type => VarMetadataSchema) build: IVarMetadata;
  @Field(type => VarMetadataSchema) item?: IVarMetadata;

  public static RESOLVERS: SchemaResolvers<IVarMetadata> = {
    ref: obj => Utils.value(obj.ref),
  };
}

@Schema()
export class EnumMetadataSchema implements IEnumMetadata {
  @Field(String) kind: GraphKind;
  @Field() name: string;
  @Field(String) ref: any;
  @Field([String]) options: string[];

  public static RESOLVERS: SchemaResolvers<IEnumMetadata> = {
    ref: obj => Utils.value(obj.ref),
  };
}

@Schema()
export class FieldMetadataSchema implements IFieldMetadata {
  @Field(String) kind: GraphKind;
  @Field() name: string;
  @Field() required: boolean;
  @Field(Object) design: DesignMetadata;
  @Field(ref => VarMetadataSchema) build: IVarMetadata;
  @Field(String) ref?: Class;
  @Field(ref => VarMetadataSchema) item?: IVarMetadata;

  public static RESOLVERS: SchemaResolvers<IFieldMetadata> = {
    ref: obj => Utils.value(obj.ref),
  };
}

@Schema()
export class TypeMetadataSchema implements ITypeMetadata {
  @Field(String) kind: GraphKind;
  @Field() name: string;
  @Field(String) target: Class;
  @Field(ref => VarMetadataSchema) item: never;
  @Field(list => [FieldMetadataSchema]) members: Record<string, IFieldMetadata>;

  public static RESOLVERS: SchemaResolvers<ITypeMetadata> = {
    target: obj => Utils.value(obj.target),
    members: (obj, args) => Lo.filter(Object.values(obj.members), args),
  };
}
