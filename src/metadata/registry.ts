import { Class } from "../types/core";
import * as Utils from "../utils/misc";
import { ApiMetadata, IApiMetadata } from "./api";
import { ColumnMetadata, IColumnMetadata } from "./column";
import { DatabaseMetadata, IDatabaseMetadata } from "./database";
import { EntityMetadata, IEntityMetadata } from "./entity";
import { EventRouteMetadata, HttpRouteMetadata, IMethodMetadata, MethodMetadata } from "./method";
import { IProxyMetadata, ProxyMetadata } from "./proxy";
import { IRelationMetadata, RelationMetadata } from "./relation";
import { IServiceMetadata, ServiceMetadata } from "./service";
import { ITypeMetadata, TypeMetadata } from "./type";

// export interface TypeDecorationMetadata {
//     target: Function;
//     decorations?: DecoratorMetadata[];
//     properties?: Record<string, PropertyDecorationMetadata>;
// }

// export interface PropertyDecorationMetadata {
//     key: string;
//     decorations?: DecoratorMetadata[];
//     parameters?: DecoratorMetadata[][];
// }

export interface DecorationMetadata {
    decorator: string;
    ordinal: number;
    target?: Class;
    propertyKey?: string;
    index?: number;
    args: Record<string, any>;
}

export interface DecoratorMetadata {
    decorator: string;
    count: number;
    targets: Record<string, Class>;
}

export interface MetadataRegistry {
    RegistryMetadata: Record<string, ITypeMetadata>;
    DecoratorMetadata: Record<string, DecoratorMetadata>;
    DecorationMetadata: DecorationMetadata[];

    ApiMetadata: Record<string, IApiMetadata>;
    ServiceMetadata: Record<string, IServiceMetadata>;
    ProxyMetadata: Record<string, IProxyMetadata>;

    DatabaseMetadata: Record<string, IDatabaseMetadata>;
    EntityMetadata: Record<string, IEntityMetadata>;
    ColumnMetadata: Record<string, IColumnMetadata>;
    RelationMetadata: Record<string, IRelationMetadata>;

    InputMetadata: Record<string, ITypeMetadata>;
    ResultMetadata: Record<string, ITypeMetadata>;

    MethodMetadata: Record<string, IMethodMetadata>;
    ResolverMetadata: Record<string, IMethodMetadata>;
    HttpRouteMetadata: Record<string, HttpRouteMetadata>;
    EventRouteMetadata: Record<string, EventRouteMetadata[]>;
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

    public static readonly RegistryMetadata: Record<string, TypeMetadata> = {};
    public static readonly DecoratorMetadata: Record<string, DecoratorMetadata> = {};
    public static readonly DecorationMetadata: DecorationMetadata[] = [];

    public static readonly ApiMetadata: Record<string, ApiMetadata> = {};
    public static readonly ServiceMetadata: Record<string, ServiceMetadata> = {};
    public static readonly ProxyMetadata: Record<string, ProxyMetadata> = {};

    public static readonly DatabaseMetadata: Record<string, DatabaseMetadata> = {};
    public static readonly EntityMetadata: Record<string, EntityMetadata> = {};
    public static readonly ColumnMetadata: Record<string, ColumnMetadata> = {};
    public static readonly RelationMetadata: Record<string, RelationMetadata> = {};
    public static readonly InputMetadata: Record<string, TypeMetadata> = {};
    public static readonly ResultMetadata: Record<string, TypeMetadata> = {};

    public static readonly MethodMetadata: Record<string, MethodMetadata> = {};
    public static readonly ResolverMetadata: Record<string, MethodMetadata> = {};
    public static readonly HttpRouteMetadata: Record<string, HttpRouteMetadata> = {};
    public static readonly EventRouteMetadata: Record<string, EventRouteMetadata[]> = {};

    // --- 

    public abstract RegistryMetadata: Record<string, TypeMetadata>;
    public abstract DecoratorMetadata: Record<string, DecoratorMetadata>;
    public abstract DecorationMetadata: DecorationMetadata[];

    public abstract ApiMetadata: Record<string, ApiMetadata>;
    public abstract ServiceMetadata: Record<string, ServiceMetadata>;
    public abstract ProxyMetadata: Record<string, ProxyMetadata>;

    public abstract DatabaseMetadata: Record<string, DatabaseMetadata>;
    public abstract EntityMetadata: Record<string, EntityMetadata>;
    public abstract ColumnMetadata: Record<string, ColumnMetadata>;
    public abstract RelationMetadata: Record<string, RelationMetadata>;
    public abstract InputMetadata: Record<string, TypeMetadata>;
    public abstract ResultMetadata: Record<string, TypeMetadata>;

    public abstract MethodMetadata: Record<string, MethodMetadata>;
    public abstract ResolverMetadata: Record<string, MethodMetadata>;
    public abstract HttpRouteMetadata: Record<string, HttpRouteMetadata>;
    public abstract EventRouteMetadata: Record<string, EventRouteMetadata[]>;

    private constructor() { }

    // private static regisry = new Registry();
    private static ordinal = 0;

    public static get(): Registry {
        let reg: MetadataRegistry = {
            RegistryMetadata: this.RegistryMetadata,
            DecoratorMetadata: this.DecoratorMetadata,
            DecorationMetadata: this.DecorationMetadata,

            ApiMetadata: this.ApiMetadata,
            ServiceMetadata: this.ServiceMetadata,
            ProxyMetadata: this.ProxyMetadata,

            DatabaseMetadata: this.DatabaseMetadata,
            EntityMetadata: this.EntityMetadata,
            ColumnMetadata: this.ColumnMetadata,
            RelationMetadata: this.RelationMetadata,
            InputMetadata: this.InputMetadata,
            ResultMetadata: this.ResultMetadata,

            MethodMetadata: this.MethodMetadata,
            ResolverMetadata: this.ResolverMetadata,
            HttpRouteMetadata: this.HttpRouteMetadata,
            EventRouteMetadata: this.EventRouteMetadata,
        };
        Object.setPrototypeOf(reg, Registry.prototype);
        return reg as any;
    }

    public static trace(decorator: string | Function, args: Record<string, any>, over: Object | Function, propertyKey?: string | symbol, index?: number) {
        let name = decorator instanceof Function ? decorator.name : decorator;
        let target = (typeof over === "object" ? over.constructor : over);
        let key = propertyKey && propertyKey.toString();
        let traceInfo: DecorationMetadata = { decorator: name, ordinal: this.ordinal++, target, propertyKey: key, index, args };
        this.DecorationMetadata.push(traceInfo);

        let decoratorInfo = this.DecoratorMetadata[name] = this.DecoratorMetadata[name] || { decorator: name, count: 0, targets: {} };
        decoratorInfo.count++;
        decoratorInfo.targets[target.name] = target;

        // let decInfo = { ordinal: this.ordinal++, target, key, index, args };
        // this.decorations.decorators[name] = this.decorations.decorators[name] || [];
        // this.decorations.decorators[name].push(decInfo);
        // let typeInfo = { decorator: name, ordinal: traceInfo.ordinal, args };
        // let type = this.decorations.types[target.name] = this.decorations.types[target.name] || { target, decorations: undefined, properties: undefined };
        // if (key) {
        //     type.properties = type.properties || {};
        //     let prop = type.properties[key] = type.properties[key]
        //         || { key, decorations: undefined, parameters: undefined };
        //     if (index !== undefined) {
        //         prop.parameters = prop.parameters || [];
        //         prop.parameters[index] = prop.parameters[index] || [];
        //         prop.parameters[index].push(typeInfo);
        //     } else {
        //         prop.decorations = prop.decorations || [];
        //         prop.decorations.push(typeInfo);
        //     }
        // } else {
        //     type.decorations = type.decorations || [];
        //     type.decorations.push(typeInfo);
        // }
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



