import * as Lo from "lodash";
import { Int, List, Metadata, Ref, Str } from "../decorators/type";
import { ResolverArgs } from "../graphql/types";
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
    @Str() serviceId: string;

    @List(item => InjectMetadataSchema) dependencies: Record<string, InjectMetadata>;
    @List(item => HandlerMetadataSchema) handlers: Record<string, HandlerMetadata>;

    @Ref(ref => HandlerMetadataSchema) initializer: HandlerMetadata;
    @Ref(ref => HandlerMetadataSchema) selector: HandlerMetadata;
    @Ref(ref => HandlerMetadataSchema) activator: HandlerMetadata;
    @Ref(ref => HandlerMetadataSchema) releasor: HandlerMetadata;

    public static target(obj: IServiceMetadata, args: ResolverArgs): string {
        return obj.target && `[class: ${obj.target.name}]`;
    }

    public static dependencies(obj: IServiceMetadata, args: ResolverArgs): InjectMetadata[] {
        return Lo.filter(Object.values(obj.dependencies), args);
    }

    public static handlers(obj: IServiceMetadata, args: ResolverArgs): HandlerMetadata[] {
        return Lo.filter(Object.values(obj.handlers), args);
    }
}