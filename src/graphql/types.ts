import { EntityMetadata } from "../metadata/entity";
import { GraphQLResolveInfo } from "graphql";
import { RelationMetadata } from "../metadata/relation";
import { ResolverQuery, ResolverArgs } from "./query";

export interface ToolkitContext {
    provider: EntityResolver;
    results?: Record<string, any[]>;
}

export type ToolkitInfo = GraphQLResolveInfo;

export interface ToolkitResolver {
    (obj: any, args: ResolverQuery & ResolverArgs, ctx: ToolkitContext, info: ToolkitInfo): Promise<any>;
}

export interface EntityResolver {
    get: QueryResolver;
    search: QueryResolver;
    create: MutationResolver;
    update: MutationResolver;
    remove: MutationResolver;
    oneToMany: RelationResolver;
    oneToOne: RelationResolver;
    manyToOne: RelationResolver;
}

export interface MutationResolver {
    (entity: EntityMetadata, obj: any, args: ResolverQuery & ResolverArgs, ctx: ToolkitContext, info: ToolkitInfo): Promise<any>;
}

export interface QueryResolver {
    (entity: EntityMetadata, obj: ResolverArgs, args: ResolverArgs, context: ToolkitContext, info?: ToolkitInfo): Promise<any>;
}

export interface RelationResolver {
    (entity: EntityMetadata, rel: RelationMetadata, root: ResolverArgs, query: ResolverQuery, context?: ToolkitContext, info?: ToolkitInfo): Promise<any>;
}