import * as Lo from "lodash";
import { QlBoolean, QlInt, QlArray, Metadata, QlObject, QlRef, QlString } from "../decorators/type";
import { ResolverArgs } from "../graphql/types";
import { DesignMetadata, EventRouteMetadata, HttpAdapter, HttpBinder, HttpBindingMetadata, HttpBindingType, HttpRouteMetadata, IMethodMetadata } from "../metadata/method";
import { GraphMetadata } from "../metadata/type";
import { Class } from "../types/core";
import { EventAdapter } from "../types/event";
import { HttpCode } from "../types/http";
import { Roles } from "../types/security";
import { GraphMetadataSchema } from "./type";

@Metadata()
export class HttpBindingMetadataSchema implements HttpBindingMetadata {
    @QlString() type: HttpBindingType;
    @QlString() path: string;
    @QlString() binder: HttpBinder;

    public static binder(obj: HttpBindingMetadata): string {
        return obj.binder && `[function: ${obj.binder.toString()}]`
    }
}

@Metadata()
export class HttpRouteMetadataSchema implements HttpRouteMetadata {
    @QlString() target: Class;
    @QlString() routeId: string;
    @QlString() serviceId: string;
    @QlString() methodId: string;
    @QlString() verb: string;
    @QlString() resource: string;
    @QlString() model: string;
    @QlInt() code: HttpCode;
    @QlString() adapter: HttpAdapter;
    // Relations
    // api: ApiMetadata;
    // method: MethodMetadata;

    public static target(obj: HttpRouteMetadata, args: ResolverArgs): string {
        return obj.target && `[class: ${obj.target.name}]`;
    }

    public static adapter(obj: HttpRouteMetadata): string {
        return obj.adapter && `[function: ${obj.adapter.toString()}]`
    }
}

@Metadata()
export class EventRouteMetadataSchema implements EventRouteMetadata {
    @QlString() target: Class;
    @QlString() eventId: string;
    @QlString() serviceId: string;
    @QlString() methodId: string;
    @QlString() source: string;
    @QlString() resource: string;
    @QlString() objectFilter: string;
    @QlString() actionFilter: string;
    @QlString() adapter: EventAdapter;

    public static target(obj: EventRouteMetadata, args: ResolverArgs): string {
        return obj.target && `[class: ${obj.target.name}]`;
    }

    public static adapter(obj: EventRouteMetadata): string {
        return obj.adapter && `[function: ${obj.adapter.toString()}]`
    }
}

@Metadata()
export class MethodMetadataSchema implements IMethodMetadata {
    @QlString() target: Class;
    @QlString() methodId: string;
    @QlString() serviceId: string;
    @QlObject() design: DesignMetadata[];

    @QlString() auth: string;
    @QlObject() roles: Roles;

    @QlBoolean() query: boolean;
    @QlBoolean() mutation: boolean;
    @QlRef(type => GraphMetadataSchema) input: GraphMetadata;
    @QlRef(type => GraphMetadataSchema) result: GraphMetadata;

    @QlString() contentType: string;
    @QlArray(type => HttpBindingMetadataSchema) bindings: HttpBindingMetadata[];
    @QlArray(type => HttpRouteMetadataSchema) http: Record<string, HttpRouteMetadata>;
    @QlArray(type => EventRouteMetadataSchema) events: Record<string, EventRouteMetadata>;

    public static target(obj: IMethodMetadata, args: ResolverArgs): string {
        return obj.target && `[class: ${obj.target.name}]`;
    }

    public static http(obj: IMethodMetadata, args: ResolverArgs): HttpRouteMetadata[] {
        return Lo.filter(Object.values(obj.http), args);
    }

    public static events(obj: IMethodMetadata, args: ResolverArgs): EventRouteMetadata[] {
        return Lo.filter(Object.values(obj.events), args);
    }
}