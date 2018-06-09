import Lo from "lodash";
import { Field, Metadata } from "../decorators/type";
import { SchemaResolvers } from "../graphql/types";
import { HandlerMetadata, InjectMetadata, IServiceMetadata } from "../metadata/service";
import { Int } from "../metadata/type";
import { Class } from "../types/core";
import { Utils } from "../utils";

@Metadata()
export class InjectMetadataSchema implements InjectMetadata {
    @Field(String) resource: string;
    @Field(String) target?: Class;
    @Field(Int) index?: number;

    public static RESOLVERS: SchemaResolvers<InjectMetadata> = {
        target: (obj) => Utils.value(obj.target)
    };
}

@Metadata()
export class HandlerMetadataSchema implements HandlerMetadata {
    @Field(String) service?: string;
    @Field(String) method: string;
    @Field(String) target: Class;

    @Field(String) source: string;

    public static RESOLVERS: SchemaResolvers<HandlerMetadata> = {
        target: (obj) => Utils.value(obj.target),
        source: (obj) => obj.target.toString()
    };
}

@Metadata()
export class ServiceMetadataSchema implements IServiceMetadata {
    @Field(String) target: Class;
    @Field(String) name: string;
    @Field(String) alias: string;

    @Field(list => [InjectMetadataSchema]) dependencies: Record<string, InjectMetadata>;
    @Field(list => [HandlerMetadataSchema]) handlers: Record<string, HandlerMetadata>;

    @Field(ref => HandlerMetadataSchema) initializer: HandlerMetadata;
    @Field(ref => HandlerMetadataSchema) selector: HandlerMetadata;
    @Field(ref => HandlerMetadataSchema) activator: HandlerMetadata;
    @Field(ref => HandlerMetadataSchema) releasor: HandlerMetadata;

    @Field(String) source: string;

    public static RESOLVERS: SchemaResolvers<IServiceMetadata> = {
        target: (obj) => Utils.value(obj.target),
        dependencies: (obj, args) => Lo.filter(Object.values(obj.dependencies), args),
        handlers: (obj, args) => Lo.filter(Object.values(obj.handlers), args),

        source: (obj) => obj.target.toString()
    };
}