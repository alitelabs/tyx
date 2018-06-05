import * as Lo from "lodash";
import { List, Metadata, Ref, Str } from "../decorators/type";
import { SchemaResolvers } from "../graphql/types";
import { IProxyMetadata } from "../metadata/proxy";
import { ResolverMetadata, InjectMetadata } from "../metadata/service";
import { Class } from "../types/core";
import { ResolverMetadataSchema, InjectMetadataSchema } from "./service";

@Metadata()
export class ProxyMetadataSchema implements IProxyMetadata {
    @Str() target: Class;
    @Str() alias: string;
    @Str() application: string = undefined;
    @Str() functionName: string = undefined;

    @List(item => InjectMetadataSchema) dependencies: Record<string, InjectMetadata>;
    @List(item => ResolverMetadataSchema) resolvers: Record<string, ResolverMetadata>;

    @Ref(ref => ResolverMetadataSchema) initializer: ResolverMetadata;
    @Ref(ref => ResolverMetadataSchema) selector: ResolverMetadata;
    @Ref(ref => ResolverMetadataSchema) activator: ResolverMetadata;
    @Ref(ref => ResolverMetadataSchema) releasor: ResolverMetadata;

    public static RESOLVERS: SchemaResolvers<IProxyMetadata> = {
        target: (obj) => obj.target && `[class: ${obj.target.name}]`,
        dependencies: (obj, args) => Lo.filter(Object.values(obj.dependencies), args),
        resolvers: (obj, args) => Lo.filter(Object.values(obj.resolvers), args)
    };
}