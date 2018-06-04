import * as Lo from "lodash";
import { Metadata, QlArray, QlRef, QlString } from "../decorators/type";
import { ResolverArgs } from "../graphql/types";
import { IProxyMetadata } from "../metadata/proxy";
import { HandlerMetadata, InjectMetadata } from "../metadata/service";
import { Class } from "../types/core";
import { HandlerMetadataSchema, InjectMetadataSchema } from "./service";

@Metadata()
export class ProxyMetadataSchema implements IProxyMetadata {
    @QlString() target: Class;
    @QlString() serviceId: string;
    @QlString() application: string = undefined;
    @QlString() functionName: string = undefined;

    @QlArray(item => InjectMetadataSchema) dependencies: Record<string, InjectMetadata>;
    @QlArray(item => HandlerMetadataSchema) handlers: Record<string, HandlerMetadata>;

    @QlRef(ref => HandlerMetadataSchema) initializer: HandlerMetadata;
    @QlRef(ref => HandlerMetadataSchema) selector: HandlerMetadata;
    @QlRef(ref => HandlerMetadataSchema) activator: HandlerMetadata;
    @QlRef(ref => HandlerMetadataSchema) releasor: HandlerMetadata;

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