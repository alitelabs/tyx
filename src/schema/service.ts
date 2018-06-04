import * as Lo from "lodash";
import { Int, List, Metadata, Ref, Str } from "../decorators/type";
import { ResolverArgs, SchemaResolvers } from "../graphql/types";
import { HandlerMetadata, InjectMetadata, IServiceMetadata } from "../metadata/service";
import { Class } from "../types/core";

@Metadata()
export class InjectMetadataSchema implements InjectMetadata {
    @Str() resource: string;
    @Str() target?: Class;
    @Int() index?: number;

    public static target(obj: InjectMetadata, args: ResolverArgs): string {
        return obj.target && `[class: ${obj.target.name}]`;
    }
}

@Metadata()
export class HandlerMetadataSchema implements HandlerMetadata {
    @Str() service?: string;
    @Str() method: string;
    @Str() target: Class;

    public static target(obj: HandlerMetadata, args: ResolverArgs): string {
        return obj.target && `[class: ${obj.target.name}]`;
    }
}

@Metadata()
export class ServiceMetadataSchema implements IServiceMetadata {
    @Str() target: Class;
    @Str() alias: string;

    @List(item => InjectMetadataSchema) dependencies: Record<string, InjectMetadata>;
    @List(item => HandlerMetadataSchema) handlers: Record<string, HandlerMetadata>;

    @Ref(ref => HandlerMetadataSchema) initializer: HandlerMetadata;
    @Ref(ref => HandlerMetadataSchema) selector: HandlerMetadata;
    @Ref(ref => HandlerMetadataSchema) activator: HandlerMetadata;
    @Ref(ref => HandlerMetadataSchema) releasor: HandlerMetadata;

    public static RESOLVERS: SchemaResolvers<IServiceMetadata> = {
        target: (obj) => obj.target && `[class: ${obj.target.name}]`,
        dependencies: (obj, args) => Lo.filter(Object.values(obj.dependencies), args),
        handlers: (obj, args) => Lo.filter(Object.values(obj.handlers), args)
    };
}