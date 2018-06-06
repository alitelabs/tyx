import * as Lo from "lodash";
import { Int, List, Metadata, Obj, Str } from "../decorators/type";
import { SchemaResolvers } from "../graphql/types";
import { IApiMetadata } from "../metadata/api";
import { IColumnMetadata } from "../metadata/column";
import { IDatabaseMetadata } from "../metadata/database";
import { IEntityMetadata } from "../metadata/entity";
import { EventRouteMetadata, HttpRouteMetadata, IMethodMetadata } from "../metadata/method";
import { IProxyMetadata } from "../metadata/proxy";
import { DecorationMetadata, DecoratorMetadata, MetadataRegistry } from "../metadata/registry";
import { IRelationMetadata } from "../metadata/relation";
import { IServiceMetadata } from "../metadata/service";
import { GraphType, ITypeMetadata } from "../metadata/type";
import { Class } from "../types/core";
import { Utils } from "../utils";
import { ApiMetadataSchema } from "./api";
import { ColumnMetadataSchema } from "./column";
import { DatabaseMetadataSchema } from "./database";
import { EntityMetadataSchema } from "./entity";
import { EventRouteMetadataSchema, HttpRouteMetadataSchema, MethodMetadataSchema } from "./method";
import { ProxyMetadataSchema } from "./proxy";
import { RelationMetadataSchema } from "./relation";
import { ServiceMetadataSchema } from "./service";
import { TypeMetadataSchema } from "./type";


@Metadata()
export class DecoratorMetadataSchema implements DecoratorMetadata {
    @Str() decorator: string;
    @Int() count: number;
    @List(GraphType.String) targets: Record<string, Class>;

    public static RESOLVERS: SchemaResolvers<DecoratorMetadata> = {
        targets: (obj) => Object.values(obj.targets).map(t => Utils.value(t))
    };
}

@Metadata()
export class DecorationMetadataSchema implements DecorationMetadata {
    @Str() decorator: string;
    @Int() ordinal: number;
    @Str() target?: Class;
    @Str() propertyKey?: string;
    @Int() index?: number;
    @Obj() args: Record<string, any>;

    public static RESOLVERS: SchemaResolvers<DecorationMetadata> = {
        target: (obj) => Utils.value(obj.target)
    };
}

@Metadata()
export class MetadataRegistrySchema implements Partial<MetadataRegistry> {

    @List(item => TypeMetadataSchema) RegistryMetadata: Record<string, ITypeMetadata>;
    @List(item => DecoratorMetadataSchema) DecoratorMetadata: Record<string, DecoratorMetadata>;
    @List(item => DecorationMetadataSchema) DecorationMetadata: DecorationMetadata[];

    @List(item => ApiMetadataSchema) ApiMetadata: Record<string, IApiMetadata>;
    @List(item => ServiceMetadataSchema) ServiceMetadata: Record<string, IServiceMetadata>;
    @List(item => ProxyMetadataSchema) ProxyMetadata: Record<string, IProxyMetadata>;

    @List(item => DatabaseMetadataSchema) DatabaseMetadata: Record<string, IDatabaseMetadata>;
    @List(item => EntityMetadataSchema) EntityMetadata: Record<string, IEntityMetadata>;
    @List(item => ColumnMetadataSchema) ColumnMetadata: Record<string, IColumnMetadata>;
    @List(item => RelationMetadataSchema) RelationMetadata: Record<string, IRelationMetadata>;

    @List(item => TypeMetadataSchema) InputMetadata: Record<string, ITypeMetadata>;
    @List(item => TypeMetadataSchema) ResultMetadata: Record<string, ITypeMetadata>;

    @List(item => MethodMetadataSchema) MethodMetadata: Record<string, IMethodMetadata>;
    @List(item => MethodMetadataSchema) ResolverMetadata: Record<string, IMethodMetadata>;
    @List(item => HttpRouteMetadataSchema) HttpRouteMetadata: Record<string, HttpRouteMetadata>;
    @List(item => EventRouteMetadataSchema) EventRouteMetadata: Record<string, EventRouteMetadata[]>;

    public static RESOLVERS: SchemaResolvers<MetadataRegistry> = {
        RegistryMetadata: (obj, args) => Lo.filter(Object.values(obj.RegistryMetadata), args),
        DecoratorMetadata: (obj, args) => Lo.filter(Object.values(obj.DecoratorMetadata), args),
        DecorationMetadata: (obj, args) => {
            if (args.target) args.target = `[class: ${args.target}]`;
            let mapped = obj.DecorationMetadata.map(meta => ({ ...meta, target: `[class: ${meta.target.name}]` }));
            return Lo.filter(mapped as any[], args);
        },
        ApiMetadata: (obj, args) => Lo.filter(Object.values(obj.ApiMetadata), args),
        ServiceMetadata: (obj, args) => Lo.filter(Object.values(obj.ServiceMetadata), args),
        ProxyMetadata: (obj, args) => Lo.filter(Object.values(obj.ProxyMetadata), args),
        DatabaseMetadata: (obj, args) => Lo.filter(Object.values(obj.DatabaseMetadata), args),
        EntityMetadata: (obj, args) => Lo.filter(Object.values(obj.EntityMetadata), args),
        ColumnMetadata: (obj, args) => Lo.filter(Object.values(obj.ColumnMetadata), args),
        RelationMetadata: (obj, args) => Lo.filter(Object.values(obj.RelationMetadata), args),
        InputMetadata: (obj, args) => Lo.filter(Object.values(obj.InputMetadata), args),
        ResultMetadata: (obj, args) => Lo.filter(Object.values(obj.ResultMetadata), args),
        MethodMetadata: (obj, args) => Lo.filter(Object.values(obj.MethodMetadata), args),
        ResolverMetadata: (obj, args) => Lo.filter(Object.values(obj.ResolverMetadata), args),
        HttpRouteMetadata: (obj, args) => Lo.filter(Object.values(obj.HttpRouteMetadata), args),
        EventRouteMetadata: (obj, args) => Lo.filter(Lo.concat([], ...Object.values(obj.EventRouteMetadata)), args)
    };
}