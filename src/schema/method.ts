import * as Lo from "lodash";
import { Bool, Int, List, Metadata, Obj, Ref, Str } from "../decorators/type";
import { ResolverArgs, SchemaResolvers } from "../graphql/types";
import { IApiMetadata } from "../metadata/api";
import { DesignMetadata, EventRouteMetadata, HttpAdapter, HttpBinder, HttpBindingMetadata, HttpBindingType, HttpRouteMetadata, IMethodMetadata } from "../metadata/method";
import { GraphMetadata, GraphType } from "../metadata/type";
import { Class } from "../types/core";
import { EventAdapter } from "../types/event";
import { HttpCode } from "../types/http";
import { Roles } from "../types/security";
import { ApiMetadataSchema } from "./api";
import { GraphMetadataSchema } from "./type";

@Metadata()
export class HttpBindingMetadataSchema implements HttpBindingMetadata {
    @Str() type: HttpBindingType;
    @Str() path: string;
    @Str() binder: HttpBinder;

    public static binder(obj: HttpBindingMetadata): string {
        return obj.binder && `[function: ${obj.binder.toString()}]`;
    }
}

@Metadata()
export class HttpRouteMetadataSchema implements HttpRouteMetadata {
    @Str() target: Class;
    @Ref(ref => ApiMetadataSchema) api: IApiMetadata;
    @Ref(ref => MethodMetadataSchema) method: IMethodMetadata;

    @Str() route: string;
    @Str() alias: string;
    @Str() handler: string;
    @Str() verb: string;
    @Str() resource: string;
    @Str() model: string;
    @List(GraphType.String) params: string[];
    @Int() code: HttpCode;
    @Str() adapter: HttpAdapter;
    // Relations
    // api: ApiMetadata;
    // method: MethodMetadata;

    public static target(obj: HttpRouteMetadata, args: ResolverArgs): string {
        return obj.target && `[class: ${obj.target.name}]`;
    }

    public static adapter(obj: HttpRouteMetadata): string {
        return obj.adapter && `[function: ${obj.adapter.toString()}]`;
    }
}

@Metadata()
export class EventRouteMetadataSchema implements EventRouteMetadata {
    @Str() target: Class;
    @Ref(ref => ApiMetadataSchema) api: IApiMetadata;
    @Ref(ref => MethodMetadataSchema) method: IMethodMetadata;

    @Str() route: string;
    @Str() alias: string;
    @Str() handler: string;
    @Str() source: string;
    @Str() resource: string;
    @Str() objectFilter: string;
    @Str() actionFilter: string;
    @Str() adapter: EventAdapter;

    public static target(obj: EventRouteMetadata, args: ResolverArgs): string {
        return obj.target && `[class: ${obj.target.name}]`;
    }

    public static adapter(obj: EventRouteMetadata): string {
        return obj.adapter && `[function: ${obj.adapter.toString()}]`;
    }
}

@Metadata()
export class MethodMetadataSchema implements IMethodMetadata {
    @Str() target: Class;
    @Ref(ref => ApiMetadataSchema) api: IApiMetadata;

    @Str() alias: string;
    @Str() name: string;
    @Obj() design: DesignMetadata[];

    @Str() auth: string;
    @Obj() roles: Roles;

    @Bool() query: boolean;
    @Bool() mutation: boolean;
    @Ref(type => GraphMetadataSchema) input: GraphMetadata;
    @Ref(type => GraphMetadataSchema) result: GraphMetadata;

    @Str() contentType: string;
    @List(type => HttpBindingMetadataSchema) bindings: HttpBindingMetadata[];
    @List(type => HttpRouteMetadataSchema) http: Record<string, HttpRouteMetadata>;
    @List(type => EventRouteMetadataSchema) events: Record<string, EventRouteMetadata>;

    public static RESOLVERS: SchemaResolvers<IMethodMetadata> = {
        target: (obj) => obj.target && `[class: ${obj.target.name}]`,
        http: (obj, args) => Lo.filter(Object.values(obj.http || {}), args),
        events: (obj, args) => Lo.filter(Object.values(obj.events || {}), args)
    };
}