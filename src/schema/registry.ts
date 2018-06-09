import Lo from "lodash";
import { Field, Metadata } from "../decorators/type";
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
import { Int, ITypeMetadata } from "../metadata/type";
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
    @Field(String) decorator: string;
    @Field(Int) count: number;
    @Field([String]) targets: Record<string, Class>;

    public static RESOLVERS: SchemaResolvers<DecoratorMetadata> = {
        targets: (obj) => Object.values(obj.targets).map(t => Utils.value(t))
    };
}

@Metadata()
export class DecorationMetadataSchema implements DecorationMetadata {
    @Field(String) decorator: string;
    @Field(Int) ordinal: number;
    @Field(String) target?: Class;
    @Field(String) propertyKey?: string;
    @Field(Int) index?: number;
    @Field(Object) args: Record<string, any>;

    public static RESOLVERS: SchemaResolvers<DecorationMetadata> = {
        target: (obj) => Utils.value(obj.target)
    };
}

@Metadata()
export class MetadataRegistrySchema implements MetadataRegistry {

    @Field(list => [TypeMetadataSchema]) RegistryMetadata: Record<string, ITypeMetadata>;
    @Field(list => [DecoratorMetadataSchema]) DecoratorMetadata: Record<string, DecoratorMetadata>;
    @Field(list => [DecorationMetadataSchema]) DecorationMetadata: DecorationMetadata[];

    @Field(list => [ApiMetadataSchema]) ApiMetadata: Record<string, IApiMetadata>;
    @Field(list => [ServiceMetadataSchema]) ServiceMetadata: Record<string, IServiceMetadata>;
    @Field(list => [ProxyMetadataSchema]) ProxyMetadata: Record<string, IProxyMetadata>;

    @Field(list => [DatabaseMetadataSchema]) DatabaseMetadata: Record<string, IDatabaseMetadata>;
    @Field(list => [EntityMetadataSchema]) EntityMetadata: Record<string, IEntityMetadata>;
    @Field(list => [ColumnMetadataSchema]) ColumnMetadata: Record<string, IColumnMetadata>;
    @Field(list => [RelationMetadataSchema]) RelationMetadata: Record<string, IRelationMetadata>;

    @Field(list => [TypeMetadataSchema]) InputMetadata: Record<string, ITypeMetadata>;
    @Field(list => [TypeMetadataSchema]) TypeMetadata: Record<string, ITypeMetadata>;

    @Field(list => [MethodMetadataSchema]) MethodMetadata: Record<string, IMethodMetadata>;
    @Field(list => [MethodMetadataSchema]) ResolverMetadata: Record<string, IMethodMetadata>;
    @Field(list => [HttpRouteMetadataSchema]) HttpRouteMetadata: Record<string, HttpRouteMetadata>;
    @Field(list => [EventRouteMetadataSchema]) EventRouteMetadata: Record<string, EventRouteMetadata[]>;

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
        TypeMetadata: (obj, args) => Lo.filter(Object.values(obj.TypeMetadata), args),
        MethodMetadata: (obj, args) => Lo.filter(Object.values(obj.MethodMetadata), args),
        ResolverMetadata: (obj, args) => Lo.filter(Object.values(obj.ResolverMetadata), args),
        HttpRouteMetadata: (obj, args) => Lo.filter(Object.values(obj.HttpRouteMetadata), args),
        EventRouteMetadata: (obj, args) => Lo.filter(Lo.concat([], ...Object.values(obj.EventRouteMetadata)), args)
    };
}