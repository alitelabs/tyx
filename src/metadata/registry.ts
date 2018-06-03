import * as Utils from "../utils/misc";
import { ApiMetadata } from "./api";
import { EntityMetadata } from "./entity";
import { EventRouteMetadata, HttpRouteMetadata, MethodMetadata } from "./method";
import { ProxyMetadata } from "./proxy";
import { RelationMetadata } from "./relation";
import { ServiceMetadata } from "./service";
import { TypeMetadata } from "./type";
import { ColumnMetadata } from "./column";
import { DatabaseMetadata } from "./database";

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

    databases: Record<string, DatabaseMetadata>;
    entities: Record<string, EntityMetadata>;
    columns: Record<string, ColumnMetadata>;
    relations: Record<string, RelationMetadata>;

    inputs: Record<string, TypeMetadata>;
    results: Record<string, TypeMetadata>;

    metadata: Record<string, TypeMetadata>;
    decorations: DecorationMetadata;

    methods: Record<string, MethodMetadata>;
    resolvers: Record<string, MethodMetadata>;
    routes: Record<string, HttpRouteMetadata>;
    events: Record<string, EventRouteMetadata[]>;
}

export abstract class Registry implements MetadataRegistry {
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

    public static readonly apis: Record<string, ApiMetadata> = {};
    public static readonly services: Record<string, ServiceMetadata> = {};
    public static readonly proxies: Record<string, ProxyMetadata> = {};

    public static readonly databases: Record<string, DatabaseMetadata> = {};
    public static readonly entities: Record<string, EntityMetadata> = {};
    public static readonly columns: Record<string, ColumnMetadata> = {};
    public static readonly relations: Record<string, RelationMetadata> = {};
    public static readonly inputs: Record<string, TypeMetadata> = {};
    public static readonly results: Record<string, TypeMetadata> = {};

    public static readonly metadata: Record<string, TypeMetadata> = {};
    public static readonly decorations: DecorationMetadata = { types: {}, decorators: {}, trace: [] };

    public static readonly methods: Record<string, MethodMetadata> = {};
    public static readonly resolvers: Record<string, MethodMetadata> = {};
    public static readonly routes: Record<string, HttpRouteMetadata> = {};
    public static readonly events: Record<string, EventRouteMetadata[]> = {};

    // --- 

    public abstract apis: Record<string, ApiMetadata>;
    public abstract services: Record<string, ServiceMetadata>;
    public abstract proxies: Record<string, ProxyMetadata>;

    public abstract databases: Record<string, DatabaseMetadata>;
    public abstract entities: Record<string, EntityMetadata>;
    public abstract columns: Record<string, ColumnMetadata>;
    public abstract relations: Record<string, RelationMetadata>;
    public abstract inputs: Record<string, TypeMetadata>;
    public abstract results: Record<string, TypeMetadata>;

    public abstract metadata: Record<string, TypeMetadata>;
    public abstract decorations: DecorationMetadata;

    public abstract methods: Record<string, MethodMetadata>;
    public abstract resolvers: Record<string, MethodMetadata>;
    public abstract routes: Record<string, HttpRouteMetadata>;
    public abstract events: Record<string, EventRouteMetadata[]>;

    private constructor() { }

    // private static regisry = new Registry();
    private static ordinal = 0;

    public static get(): Registry {
        let reg: MetadataRegistry = {
            metadata: this.metadata,
            decorations: this.decorations,

            apis: this.apis,
            services: this.services,
            proxies: this.proxies,

            databases: this.databases,
            entities: this.entities,
            columns: this.columns,
            relations: this.relations,
            inputs: this.inputs,
            results: this.results,

            methods: this.methods,
            resolvers: this.resolvers,
            routes: this.routes,
            events: this.events,
        };
        Object.setPrototypeOf(reg, Registry.prototype);
        return reg as any;
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
        if (key) {
            type.properties = type.properties || {};
            let prop = type.properties[key] = type.properties[key]
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

    public stringify(ident?: number) {
        // TODO: Circular references
        function filter(key: string, value: any) {
            if (value instanceof Function) {
                if (Utils.isClass(value)) {
                    return `[class: ${value.name || "inline"}]`;
                } else if (value.name) {
                    return `[function: ${value.name}]`;
                } else {
                    // TODO: is arrow function
                    return `[ref: ${value.toString()}]`;
                }
            }
            if (key.startsWith("inverse"))
                if (value instanceof EntityMetadata || value instanceof RelationMetadata) return `#(${value.target.name})`;
            return value;
        }
        return JSON.stringify(this, filter, ident);
    }
}



