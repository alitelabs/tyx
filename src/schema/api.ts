import * as Lo from "lodash";
import { List, Metadata, Str } from "../decorators/type";
import { SchemaResolvers } from "../graphql/types";
import { IApiMetadata } from "../metadata/api";
import { EventRouteMetadata, HttpRouteMetadata, IMethodMetadata } from "../metadata/method";
import { Class } from "../types/core";
import { EventRouteMetadataSchema, HttpRouteMetadataSchema, MethodMetadataSchema } from "./method";
import { Utils } from "../utils";

@Metadata()
export class ApiMetadataSchema implements IApiMetadata {
    @Str() target: Class;
    @Str() name: string;
    @Str() alias: string;

    @List(item => MethodMetadataSchema) methods: Record<string, IMethodMetadata>;
    @List(item => HttpRouteMetadataSchema) routes: Record<string, HttpRouteMetadata>;
    @List(item => EventRouteMetadataSchema) events: Record<string, EventRouteMetadata[]>;

    @Str() source: string;

    public static RESOLVERS: SchemaResolvers<IApiMetadata> = {
        target: (obj) => Utils.value(obj.target),
        methods: (obj, args) => Lo.filter(Object.values(obj.methods), args),
        routes: (obj, args) => Lo.filter(Object.values(obj.routes), args),
        events: (obj, args) => Lo.filter(Lo.concat([], ...Object.values(obj.events)), args),

        source: (obj) => obj.target.toString()
    };
}