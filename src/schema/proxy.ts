import * as Lo from "lodash";
import { List, Metadata, Ref, Str } from "../decorators/type";
import { SchemaResolvers } from "../graphql/types";
import { IProxyMetadata } from "../metadata/proxy";
import { ResolverMetadata, InjectMetadata } from "../metadata/service";
import { Class } from "../types/core";
import { ResolverMetadataSchema, InjectMetadataSchema } from "./service";
import { Utils } from "../utils";

@Metadata()
export class ProxyMetadataSchema implements IProxyMetadata {
    @Str() target: Class;
    @Str() name: string;
    @Str() alias: string;
    @Str() application: string = undefined;
    @Str() functionName: string = undefined;

    @List(item => InjectMetadataSchema) dependencies: Record<string, InjectMetadata>;
    @List(item => ResolverMetadataSchema) resolvers: Record<string, ResolverMetadata>;

    @Ref(ref => ResolverMetadataSchema) initializer: ResolverMetadata;
    @Ref(ref => ResolverMetadataSchema) selector: ResolverMetadata;
    @Ref(ref => ResolverMetadataSchema) activator: ResolverMetadata;
    @Ref(ref => ResolverMetadataSchema) releasor: ResolverMetadata;

    @Str() source: string;

    public static RESOLVERS: SchemaResolvers<IProxyMetadata> = {
        target: (obj) => Utils.value(obj.target),
        dependencies: (obj, args) => Lo.filter(Object.values(obj.dependencies), args),
        resolvers: (obj, args) => Lo.filter(Object.values(obj.resolvers), args),

        source: (obj) => obj.target.toString()
    };
}