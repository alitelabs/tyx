import * as Lo from "lodash";
import { Bool, List, Metadata, Obj, Ref, Str } from "../decorators/type";
import { SchemaResolvers } from "../graphql";
import { DesignMetadata } from "../metadata/method";
import { FieldMetadata, GraphMetadata, GraphType, ITypeMetadata } from "../metadata/type";
import { Class } from "../types/core";
import { Utils } from "../utils";

@Metadata()
export class GraphMetadataSchema implements GraphMetadata {
    @Str() target?: Class;
    @Str() type: GraphType;
    @Ref(type => GraphMetadataSchema) item?: GraphMetadata;

    public static RESOLVERS: SchemaResolvers<GraphMetadata> = {
        target: (obj) => Utils.value(obj.target)
    };
}

@Metadata()
export class FieldMetadataSchema implements FieldMetadata {
    @Str() target?: Class;
    @Str() type: GraphType;
    @Str() name: string;
    @Bool() required: boolean;
    @Ref(ref => GraphMetadataSchema) item?: GraphMetadata;
    @Obj() design: DesignMetadata;

    public static RESOLVERS: SchemaResolvers<FieldMetadata> = {
        target: (obj) => Utils.value(obj.target)
    };
}

@Metadata()
export class TypeMetadataSchema implements ITypeMetadata {
    @Str() target: Class;
    @Str() name: string;
    @Str() type: GraphType;
    @List(item => FieldMetadataSchema) fields?: Record<string, FieldMetadata>;

    public static RESOLVERS: SchemaResolvers<ITypeMetadata> = {
        target: (obj) => Utils.value(obj.target),
        fields: (obj, args) => Lo.filter(Object.values(obj.fields), args)
    };
}