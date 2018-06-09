import Lo from "lodash";
import { Field, Metadata } from "../decorators/type";
import { SchemaResolvers } from "../graphql";
import { DesignMetadata } from "../metadata/method";
import { EnumMetadata, FieldMetadata, GraphKind, IEnumMetadata, ITypeMetadata, VarMetadata } from "../metadata/type";
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

    public static RESOLVERS: SchemaResolvers<EnumMetadata> = {
        ref: (obj) => Utils.value(obj.ref)
    };
}

@Metadata()
export class FieldMetadataSchema implements FieldMetadata {
    @Field(String) ref?: Class;
    @Field(String) kind: GraphKind;
    @Field(String) name: string;
    @Field(Boolean) required: boolean;
    @Field(ref => VarMetadataSchema) item?: VarMetadata;
    @Field(Object) design: DesignMetadata;

    public static RESOLVERS: SchemaResolvers<FieldMetadata> = {
        ref: (obj) => Utils.value(obj.ref)
    };
}

@Metadata()
export class TypeMetadataSchema implements ITypeMetadata {
    @Field(String) ref: Class;
    @Field(String) name: string;
    @Field(String) kind: GraphKind;
    @Field(list => [FieldMetadataSchema]) fields?: Record<string, FieldMetadata>;

    public static RESOLVERS: SchemaResolvers<ITypeMetadata> = {
        ref: (obj) => Utils.value(obj.ref),
        fields: (obj, args) => Lo.filter(Object.values(obj.fields), args)
    };
}