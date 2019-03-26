// tslint:disable-next-line:import-name
import Lo = require('lodash');
import { Schema } from '../decorators/schema';
import { Field } from '../decorators/type';
import { IEnumMetadata } from '../metadata/enum';
import { IDesignMetadata, IFieldMetadata } from '../metadata/field';
import { IArgMetadata } from '../metadata/input';
import { IResultMetadata } from '../metadata/result';
import { ITypeMetadata } from '../metadata/type';
import { IVarMetadata, VarKind } from '../metadata/var';
import { Class, SchemaResolvers } from '../types/core';
import { Utils } from '../utils';

@Schema()
export class VarMetadataSchema implements IVarMetadata {
  @Field(String) ref?: Class;
  @Field(String) kind: VarKind;
  @Field(type => VarMetadataSchema) item?: IVarMetadata;

  public static RESOLVERS: SchemaResolvers<IVarMetadata> = {
    ref: obj => Utils.label(obj.ref),
  };
}

@Schema()
export class InputMetadataSchema implements IArgMetadata {
  @Field(0) index: number;
  @Field() name: string;
  @Field(String) kind: VarKind;
  @Field(String) design: Class;
  @Field(String) ref?: Class;
  @Field() defined: boolean;
  @Field(type => VarMetadataSchema) build: IVarMetadata;
  @Field(type => VarMetadataSchema) item?: IVarMetadata;

  public static RESOLVERS: SchemaResolvers<IArgMetadata> = {
    design: obj => Utils.label(obj.design),
    ref: obj => Utils.label(obj.ref)
  };
}

@Schema()
export class ResultMetadataSchema implements IResultMetadata {
  @Field(String) kind: VarKind;
  @Field(String) design: Class;
  @Field() promise: boolean;
  @Field(String) ref?: Class;
  @Field() defined: boolean;
  @Field(type => VarMetadataSchema) build: IVarMetadata;
  @Field(type => VarMetadataSchema) item?: IVarMetadata;

  public static RESOLVERS: SchemaResolvers<IResultMetadata> = {
    design: obj => Utils.label(obj.design),
    ref: obj => Utils.label(obj.ref),
  };
}

@Schema()
export class EnumMetadataSchema implements IEnumMetadata {
  @Field() name: string;
  @Field(String) kind: VarKind;
  @Field(String) ref: any;
  @Field([String]) options: string[];

  public static RESOLVERS: SchemaResolvers<IEnumMetadata> = {
    ref: obj => Utils.label(obj.ref),
  };
}

@Schema()
export class FieldMetadataSchema implements IFieldMetadata {
  @Field(String) kind: VarKind;
  @Field() name: string;
  @Field() mandatory: boolean;
  @Field(Object) design: IDesignMetadata;
  @Field(ref => VarMetadataSchema) build: IVarMetadata;
  @Field(String) ref?: Class;
  @Field(ref => VarMetadataSchema) item?: IVarMetadata;

  public static RESOLVERS: SchemaResolvers<IFieldMetadata> = {
    ref: obj => Utils.label(obj.ref),
  };
}

@Schema()
export class TypeMetadataSchema implements ITypeMetadata {
  @Field(String) kind: VarKind;
  @Field() name: string;
  @Field(String) target: Class;
  @Field(ref => VarMetadataSchema) item: never;
  @Field(list => [FieldMetadataSchema]) members: Record<string, IFieldMetadata>;

  public static RESOLVERS: SchemaResolvers<ITypeMetadata> = {
    target: obj => Utils.label(obj.target),
    members: (obj, args) => Lo.filter(Object.values(obj.members), args),
  };
}
