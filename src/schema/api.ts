import * as Lo from "lodash";
import { QlArray, Metadata, QlString } from "../decorators/type";
import { ResolverArgs } from "../graphql/types";
import { IApiMetadata } from "../metadata/api";
import { EventRouteMetadata, HttpRouteMetadata, IMethodMetadata } from "../metadata/method";
import { Class } from "../types/core";
import { EventRouteMetadataSchema, HttpRouteMetadataSchema, MethodMetadataSchema } from "./method";

@Metadata()
export class ApiMetadataSchema implements IApiMetadata {
    @QlString() target: Class;
    @QlString() alias: string;

    @QlArray(item => MethodMetadataSchema) methods: Record<string, IMethodMetadata>;
    @QlArray(item => HttpRouteMetadataSchema) routes: Record<string, HttpRouteMetadata>;
    @QlArray(item => EventRouteMetadataSchema) events: Record<string, EventRouteMetadata[]>;

    public static target(obj: IApiMetadata, args: ResolverArgs): string {
        return obj.target && `[class: ${obj.target.name}]`;
    }

    public static methods(obj: IApiMetadata, args: ResolverArgs): IMethodMetadata[] {
        return Lo.filter(Object.values(obj.methods), args);
    }

    public static routes(obj: IApiMetadata, args: ResolverArgs): HttpRouteMetadata[] {
        return Lo.filter(Object.values(obj.routes), args);
    }

    public static events(obj: IApiMetadata, args: ResolverArgs): EventRouteMetadata[] {
        return Lo.filter(Lo.concat([], ...Object.values(obj.events)), args);
    }
}