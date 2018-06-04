import * as Lo from "lodash";
import { QlInt, QlArray, Metadata, QlObject, QlString } from "../decorators/type";
import { ResolverArgs } from "../graphql/types";
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
    @QlString() decorator: string;
    @QlInt() count: number;
    @QlArray(GraphType.String) targets: Record<string, Class>;

    public static targets(parent: DecoratorMetadata, args: ResolverArgs): string[] {
        return Object.values(parent.targets).map(t => `[class: ${t.name}]`);
    }
}

@Metadata()
export class DecorationMetadataSchema implements DecorationMetadata {
    @QlString() decorator: string;
    @QlInt() ordinal: number;
    @QlString() target?: Class;
    @QlString() propertyKey?: string;
    @QlInt() index?: number;
    @QlObject() args: Record<string, any>;

    public static target(parent: IColumnMetadata, args: ResolverArgs): string {
        if (typeof parent.target === "string") return parent.target;
        return parent.target && `[class: ${parent.target.name}]`;
    }
}

@Metadata()
export class MetadataRegistrySchema implements Partial<MetadataRegistry> {

    @QlArray(item => TypeMetadataSchema) RegistryMetadata: Record<string, ITypeMetadata>;
    @QlArray(item => DecoratorMetadataSchema) DecoratorMetadata: Record<string, DecoratorMetadata>;
    @QlArray(item => DecorationMetadataSchema) DecorationMetadata: DecorationMetadata[];

    @QlArray(item => ApiMetadataSchema) ApiMetadata: Record<string, IApiMetadata>;
    @QlArray(item => ServiceMetadataSchema) ServiceMetadata: Record<string, IServiceMetadata>;
    @QlArray(item => ProxyMetadataSchema) ProxyMetadata: Record<string, IProxyMetadata>;

    @QlArray(item => DatabaseMetadataSchema) DatabaseMetadata: Record<string, IDatabaseMetadata>;
    @QlArray(item => EntityMetadataSchema) EntityMetadata: Record<string, IEntityMetadata>;
    @QlArray(item => ColumnMetadataSchema) ColumnMetadata: Record<string, IColumnMetadata>;
    @QlArray(item => RelationMetadataSchema) RelationMetadata: Record<string, IRelationMetadata>;

    @QlArray(item => TypeMetadataSchema) InputMetadata: Record<string, ITypeMetadata>;
    @QlArray(item => TypeMetadataSchema) ResultMetadata: Record<string, ITypeMetadata>;

    @QlArray(item => MethodMetadataSchema) MethodMetadata: Record<string, IMethodMetadata>;
    @QlArray(item => MethodMetadataSchema) ResolverMetadata: Record<string, IMethodMetadata>;
    @QlArray(item => HttpRouteMetadataSchema) HttpRouteMetadata: Record<string, HttpRouteMetadata>;
    @QlArray(item => EventRouteMetadataSchema) EventRouteMetadata: Record<string, EventRouteMetadata[]>;

    public static RegistryMetadata(obj: MetadataRegistry, args: ResolverArgs): ITypeMetadata[] {
        return Lo.filter(Object.values(obj.RegistryMetadata), args);
    }

    public static DecoratorMetadata(obj: MetadataRegistry, args: ResolverArgs): DecoratorMetadata[] {
        return Lo.filter(Object.values(obj.DecoratorMetadata), args);
    }

    public static DecorationMetadata(obj: MetadataRegistry, args: ResolverArgs): DecorationMetadata[] {
        if (args.target) args.target = `[class: ${args.target}]`;
        let mapped = obj.DecorationMetadata.map(meta => ({ ...meta, target: `[class: ${meta.target.name}]` }));
        return Lo.filter(mapped as any[], args);
    }

    public static ApiMetadata(obj: MetadataRegistry, args: ResolverArgs): IApiMetadata[] {
        return Lo.filter(Object.values(obj.ApiMetadata), args);
    }

    public static ServiceMetadata(obj: MetadataRegistry, args: ResolverArgs): IServiceMetadata[] {
        return Lo.filter(Object.values(obj.ServiceMetadata), args);
    }

    public static ProxyMetadata(obj: MetadataRegistry, args: ResolverArgs): IProxyMetadata[] {
        return Lo.filter(Object.values(obj.ProxyMetadata), args);
    }

    public static DatabaseMetadata(obj: MetadataRegistry, args: ResolverArgs): IDatabaseMetadata[] {
        return Lo.filter(Object.values(obj.DatabaseMetadata), args);
    }

    public static EntityMetadata(obj: MetadataRegistry, args: ResolverArgs): IEntityMetadata[] {
        return Lo.filter(Object.values(obj.EntityMetadata), args);
    }

    public static ColumnMetadata(obj: MetadataRegistry, args: ResolverArgs): IColumnMetadata[] {
        return Lo.filter(Object.values(obj.ColumnMetadata), args);
    }

    public static RelationMetadata(obj: MetadataRegistry, args: ResolverArgs): IRelationMetadata[] {
        return Lo.filter(Object.values(obj.RelationMetadata), args);
    }

    public static InputMetadata(obj: MetadataRegistry, args: ResolverArgs): ITypeMetadata[] {
        return Lo.filter(Object.values(obj.InputMetadata), args);
    }

    public static ResultMetadata(obj: MetadataRegistry, args: ResolverArgs): ITypeMetadata[] {
        return Lo.filter(Object.values(obj.ResultMetadata), args);
    }

    public static MethodMetadata(obj: MetadataRegistry, args: ResolverArgs): IMethodMetadata[] {
        return Lo.filter(Object.values(obj.MethodMetadata), args);
    }

    public static ResolverMetadata(obj: MetadataRegistry, args: ResolverArgs): IMethodMetadata[] {
        return Lo.filter(Object.values(obj.ResolverMetadata), args);
    }

    public static HttpRouteMetadata(obj: MetadataRegistry, args: ResolverArgs): HttpRouteMetadata[] {
        return Lo.filter(Object.values(obj.HttpRouteMetadata), args);
    }

    public static EventRouteMetadata(obj: MetadataRegistry, args: ResolverArgs): EventRouteMetadata[] {
        return Lo.filter(Lo.concat([], ...Object.values(obj.EventRouteMetadata)), args);
    }
}