import * as Lo from "lodash";
import { QlBoolean, QlArray, Metadata, QlObject, QlRef, QlString } from "../decorators/type";
import { ResolverArgs } from "../graphql";
import { DesignMetadata } from "../metadata/method";
import { FieldMetadata, GraphMetadata, GraphType, ITypeMetadata } from "../metadata/type";
import { Class } from "../types/core";

@Metadata()
export class GraphMetadataSchema implements GraphMetadata {
    @QlString() target?: Class;
    @QlString() type: GraphType;
    @QlRef(type => GraphMetadataSchema) item?: GraphMetadata;

    public static target(obj: GraphMetadata): string {
        return obj.target && `[class: ${obj.target.name}]`;
    }
}

@Metadata()
export class FieldMetadataSchema implements FieldMetadata {
    @QlString() target?: Class;
    @QlString() type: GraphType;
    @QlString() name: string;
    @QlBoolean() required: boolean;
    @QlRef(ref => GraphMetadataSchema) item?: GraphMetadata;
    @QlObject() design: DesignMetadata;

    public static target(obj: GraphMetadata): string {
        return obj.target && `[class: ${obj.target.name}]`;
    }
}

@Metadata()
export class TypeMetadataSchema implements ITypeMetadata {
    @QlString() target: Class;
    @QlString() name: string;
    @QlString() type: GraphType;
    @QlArray(item => FieldMetadataSchema) fields?: Record<string, FieldMetadata>;

    public static target(obj: GraphMetadata): string {
        return obj.target && `[class: ${obj.target.name}]`;
    }

    public static fields(obj: ITypeMetadata, args: ResolverArgs): FieldMetadata[] {
        return Lo.filter(Object.values(obj.fields), args);
    }
}