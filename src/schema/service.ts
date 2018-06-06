import * as Lo from "lodash";
import { Int, List, Metadata, Ref, Str } from "../decorators/type";
import { SchemaResolvers } from "../graphql/types";
import { InjectMetadata, IServiceMetadata, ResolverMetadata } from "../metadata/service";
import { Class } from "../types/core";
import { Utils } from "../utils";

@Metadata()
export class InjectMetadataSchema implements InjectMetadata {
    @Str() resource: string;
    @Str() target?: Class;
    @Int() index?: number;

    public static RESOLVERS: SchemaResolvers<InjectMetadata> = {
        target: (obj) => Utils.value(obj.target)
    };
}

@Metadata()
export class ResolverMetadataSchema implements ResolverMetadata {
    @Str() service?: string;
    @Str() method: string;
    @Str() target: Class;

    @Str() source: string;

    public static RESOLVERS: SchemaResolvers<ResolverMetadata> = {
        target: (obj) => Utils.value(obj.target),
        source: (obj) => obj.target.toString()
    };
}

@Metadata()
export class ServiceMetadataSchema implements IServiceMetadata {
    @Str() target: Class;
    @Str() name: string;
    @Str() alias: string;

    @List(item => InjectMetadataSchema) dependencies: Record<string, InjectMetadata>;
    @List(item => ResolverMetadataSchema) resolvers: Record<string, ResolverMetadata>;

    @Ref(ref => ResolverMetadataSchema) initializer: ResolverMetadata;
    @Ref(ref => ResolverMetadataSchema) selector: ResolverMetadata;
    @Ref(ref => ResolverMetadataSchema) activator: ResolverMetadata;
    @Ref(ref => ResolverMetadataSchema) releasor: ResolverMetadata;

    @Str() source: string;

    public static RESOLVERS: SchemaResolvers<IServiceMetadata> = {
        target: (obj) => Utils.value(obj.target),
        dependencies: (obj, args) => Lo.filter(Object.values(obj.dependencies), args),
        resolvers: (obj, args) => Lo.filter(Object.values(obj.resolvers), args),

        source: (obj) => obj.target.toString()
    };
}