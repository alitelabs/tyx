import { ApiMetadata } from "./api";
import { EventRouteMetadata, HttpRouteMetadata, MethodMetadata } from "./method";
import { ProxyMetadata } from "./proxy";
import { ServiceMetadata } from "./service";

export interface TypeDecorationMetadata {
    target: Function;
    decorations?: DecoratorMetadata[];
    properties?: Record<string, PropertyDecorationMetadata>;
}

export interface PropertyDecorationMetadata {
    key: string;
    decorations?: DecoratorMetadata[];
    parameters?: DecoratorMetadata[][];
}

export interface DecoratorMetadata {
    decorator: string;
    ordinal: number;
    target?: Function;
    propertyKey?: string;
    index?: number;
    args: Record<string, any>;
}

export interface DecorationMetadata {
    types: Record<string, TypeDecorationMetadata>;
    decorators: Record<string, TypeDecorationMetadata[]>;
    trace: TypeDecorationMetadata[];
}

export interface MetadataRegistry {
    apis: Record<string, ApiMetadata>;
    services: Record<string, ServiceMetadata>;
    proxies: Record<string, ProxyMetadata>;
    methods: Record<string, MethodMetadata>;
    resolvers: Record<string, MethodMetadata>;
    routes: Record<string, HttpRouteMetadata>;
    events: Record<string, EventRouteMetadata[]>;
    decorations: DecorationMetadata;
}

export abstract class Metadata {

    public static readonly DESIGN_TYPE = "design:type";
    public static readonly DESIGN_PARAMS = "design:paramtypes";
    public static readonly DESIGN_RETURN = "design:returntype";

    public static readonly TYX_METADATA = "tyx:metadata";
    public static readonly TYX_API = "tyx:api";
    public static readonly TYX_SERVICE = "tyx:service";
    public static readonly TYX_PROXY = "tyx:proxy";
    public static readonly TYX_DATABASE = "tyx:database";
    public static readonly TYX_TYPE = "tyx:type";
    public static readonly TYX_METHOD = "tyx:method";

    public static readonly TYX_ENTITY = "tyx:entity";
    public static readonly TYX_COLUMN = "tyx:column";
    public static readonly TYX_RELATION = "tyx:relation";

    public static decorations: DecorationMetadata = { types: {}, decorators: {}, trace: [] };
    public static apis: Record<string, ApiMetadata> = {};
    public static services: Record<string, ServiceMetadata> = {};
    public static proxies: Record<string, ProxyMetadata> = {};
    public static methods: Record<string, MethodMetadata> = {};
    public static resolvers: Record<string, MethodMetadata> = {};
    public static routes: Record<string, HttpRouteMetadata> = {};
    public static events: Record<string, EventRouteMetadata[]> = {};

    private static ordinal = 0;

    public static get registry(): MetadataRegistry {
        return {
            apis: this.apis,
            services: this.services,
            proxies: this.proxies,
            methods: this.methods,
            resolvers: this.resolvers,
            routes: this.routes,
            events: this.events,
            decorations: this.decorations
        };
    }

    public static trace(decorator: string | Function, args: Record<string, any>, over: Object | Function, propertyKey?: string | symbol, index?: number) {
        let name = decorator instanceof Function ? decorator.name : decorator;
        let target = (typeof over === "object" ? over.constructor : over);
        let key = propertyKey && propertyKey.toString();
        let traceInfo = { decorator: name, ordinal: this.ordinal++, target, key, index, args };
        this.decorations.trace.push(traceInfo);
        let decInfo = { ordinal: this.ordinal++, target, key, index, args };
        this.decorations.decorators[name] = this.decorations.decorators[name] || [];
        this.decorations.decorators[name].push(decInfo);
        let typeInfo = { decorator: name, ordinal: traceInfo.ordinal, args };
        let type = this.decorations.types[target.name] = this.decorations.types[target.name] || { target, decorations: undefined, properties: undefined };
        if (propertyKey) {
            type.properties = type.properties || {};
            let prop = type.properties[key] = type.properties[propertyKey]
                || { key, decorations: undefined, parameters: undefined };
            if (index !== undefined) {
                prop.parameters = prop.parameters || [];
                prop.parameters[index] = prop.parameters[index] || [];
                prop.parameters[index].push(typeInfo);
            } else {
                prop.decorations = prop.decorations || [];
                prop.decorations.push(typeInfo);
            }
        } else {
            type.decorations = type.decorations || [];
            type.decorations.push(typeInfo);
        }
    }

    public static stringify(data: any, ident?: number) {
        // TODO: Circular references
        return JSON.stringify(data,
            (key, value) => value instanceof Function ? `[function: ${value.name || "inline"}]` : value, ident);
    }
}

