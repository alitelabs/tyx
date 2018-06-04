import * as Lo from "lodash";
import { List, Metadata, Ref, Str } from "../decorators/type";
import { SchemaResolvers } from "../graphql/types";
import { IProxyMetadata } from "../metadata/proxy";
import { HandlerMetadata, InjectMetadata } from "../metadata/service";
import { Class } from "../types/core";
import { HandlerMetadataSchema, InjectMetadataSchema } from "./service";

@Metadata()
export class ProxyMetadataSchema implements IProxyMetadata {
    @Str() target: Class;
    @Str() alias: string;
    @Str() application: string = undefined;
    @Str() functionName: string = undefined;

    @List(item => InjectMetadataSchema) dependencies: Record<string, InjectMetadata>;
    @List(item => HandlerMetadataSchema) handlers: Record<string, HandlerMetadata>;

    @Ref(ref => HandlerMetadataSchema) initializer: HandlerMetadata;
    @Ref(ref => HandlerMetadataSchema) selector: HandlerMetadata;
    @Ref(ref => HandlerMetadataSchema) activator: HandlerMetadata;
    @Ref(ref => HandlerMetadataSchema) releasor: HandlerMetadata;

    public static RESOLVERS: SchemaResolvers<IProxyMetadata> = {
        target: (obj) => obj.target && `[class: ${obj.target.name}]`,
        dependencies: (obj, args) => Lo.filter(Object.values(obj.dependencies), args),
        handlers: (obj, args) => Lo.filter(Object.values(obj.handlers), args)
    };
}