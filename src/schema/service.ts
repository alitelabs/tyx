import * as Lo from "lodash";
import { QlInt, QlArray, Metadata, QlRef, QlString } from "../decorators/type";
import { ResolverArgs } from "../graphql/types";
import { HandlerMetadata, InjectMetadata, IServiceMetadata } from "../metadata/service";
import { Class } from "../types/core";

@Metadata()
export class InjectMetadataSchema implements InjectMetadata {
    @QlString() resource: string;
    @QlString() target?: Class;
    @QlInt() index?: number;

    public static target(obj: InjectMetadata, args: ResolverArgs): string {
        return obj.target && `[class: ${obj.target.name}]`;
    }
}

@Metadata()
export class HandlerMetadataSchema implements HandlerMetadata {
    @QlString() service?: string;
    @QlString() method: string;
    @QlString() target: Class;

    public static target(obj: HandlerMetadata, args: ResolverArgs): string {
        return obj.target && `[class: ${obj.target.name}]`;
    }
}

@Metadata()
export class ServiceMetadataSchema implements IServiceMetadata {
    @QlString() target: Class;
    @QlString() serviceId: string;

    @QlArray(item => InjectMetadataSchema) dependencies: Record<string, InjectMetadata>;
    @QlArray(item => HandlerMetadataSchema) handlers: Record<string, HandlerMetadata>;

    @QlRef(ref => HandlerMetadataSchema) initializer: HandlerMetadata;
    @QlRef(ref => HandlerMetadataSchema) selector: HandlerMetadata;
    @QlRef(ref => HandlerMetadataSchema) activator: HandlerMetadata;
    @QlRef(ref => HandlerMetadataSchema) releasor: HandlerMetadata;

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