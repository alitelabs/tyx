import Lo from "lodash";
import { Field, Metadata } from "../decorators/type";
import { SchemaResolvers } from "../graphql";
import { DesignMetadata } from "../metadata/method";
import { GraphKind, IEnumMetadata, IFieldMetadata, ITypeMetadata, VarMetadata } from "../metadata/type";
import { Class } from "../types/core";
import { Utils } from "../utils";

@Metadata()
export class VarMetadataSchema implements VarMetadata {
    @Field(String) ref?: Class;
    @Field(String) kind: GraphKind;
    @Field(type => VarMetadataSchema) item?: VarMetadata;

    public static RESOLVERS: SchemaResolvers<VarMetadata> = {
        ref: (obj) => Utils.value(obj.ref)
    };
}

@Metadata()
export class EnumMetadataSchema implements IEnumMetadata {
    @Field(String) kind: GraphKind;
    @Field(String) name: string;
    @Field(String) ref: any;
    @Field([String]) options: string[];

    public static RESOLVERS: SchemaResolvers<IEnumMetadata> = {
        ref: (obj) => Utils.value(obj.ref)
    };
}

@Metadata()
export class FieldMetadataSchema implements IFieldMetadata {
    @Field(String) kind: GraphKind;
    @Field(String) name: string;
    @Field(Boolean) required: boolean;
    @Field(Object) design: DesignMetadata;
    @Field(ref => VarMetadataSchema) type: VarMetadata;
    @Field(String) ref?: Class;
    @Field(ref => VarMetadataSchema) item?: VarMetadata;

    public static RESOLVERS: SchemaResolvers<IFieldMetadata> = {
        ref: (obj) => Utils.value(obj.ref)
    };
}

@Metadata()
export class TypeMetadataSchema implements ITypeMetadata {
    @Field(String) ref: Class;
    @Field(String) name: string;
    @Field(String) kind: GraphKind;
    @Field(list => [FieldMetadataSchema]) fields?: Record<string, IFieldMetadata>;

    public static RESOLVERS: SchemaResolvers<ITypeMetadata> = {
        ref: (obj) => Utils.value(obj.ref),
        fields: (obj, args) => Lo.filter(Object.values(obj.fields), args)
    };
}