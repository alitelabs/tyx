import * as Lo from "lodash";
import { Bool, List, Metadata, Obj, Ref, Str } from "../decorators/type";
import { ResolverArgs } from "../graphql";
import { DesignMetadata } from "../metadata/method";
import { FieldMetadata, GraphMetadata, GraphType, ITypeMetadata } from "../metadata/type";
import { Class } from "../types/core";

@Metadata()
export class GraphMetadataSchema implements GraphMetadata {
    @Str() target?: Class;
    @Str() type: GraphType;
    @Ref(type => GraphMetadataSchema) item?: GraphMetadata;

    public static target(obj: GraphMetadata): string {
        return obj.target && `[class: ${obj.target.name}]`;
    }
}

@Metadata()
export class FieldMetadataSchema implements FieldMetadata {
    @Str() target?: Class;
    @Str() type: GraphType;
    @Str() name: string;
    @Bool() required: boolean;
    @Ref(ref => GraphMetadataSchema) item?: GraphMetadata;
    @Obj() design: DesignMetadata;

    public static target(obj: GraphMetadata): string {
        return obj.target && `[class: ${obj.target.name}]`;
    }
}

@Metadata()
export class TypeMetadataSchema implements ITypeMetadata {
    @Str() target: Class;
    @Str() name: string;
    @Str() type: GraphType;
    @List(item => FieldMetadataSchema) fields?: Record<string, FieldMetadata>;

    public static target(obj: GraphMetadata): string {
        return obj.target && `[class: ${obj.target.name}]`;
    }

    public static fields(obj: ITypeMetadata, args: ResolverArgs): FieldMetadata[] {
        return Lo.filter(Object.values(obj.fields), args);
    }
}