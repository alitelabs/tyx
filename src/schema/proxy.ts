import * as Lo from "lodash";
import { Metadata, List, Ref, Str } from "../decorators/type";
import { ResolverArgs } from "../graphql/types";
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

    public static target(obj: IProxyMetadata, args: ResolverArgs): string {
        return obj.target && `[class: ${obj.target.name}]`;
    }

    public static dependencies(obj: IProxyMetadata, args: ResolverArgs): InjectMetadata[] {
        return Lo.filter(Object.values(obj.dependencies), args);
    }

    public static handlers(obj: IProxyMetadata, args: ResolverArgs): HandlerMetadata[] {
        return Lo.filter(Object.values(obj.handlers), args);
    }

}