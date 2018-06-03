import { GraphQLResolveInfo } from "graphql";
import { EntityMetadata } from "../metadata/entity";
import { RelationMetadata } from "../metadata/relation";

export type InputNode = Record<string, string | boolean | number>;
export type ArrayNode = Record<string, string[] | boolean[] | number[]>;
export type LikeNode = Record<string, string>;
export type NullNode = Record<string, boolean>;
export type OrderNode = Record<string, number>;

// https://docs.mongodb.com/manual/reference/operator/

export interface ResolverExpression {
    if?: InputNode;
    eq?: InputNode;
    gt?: InputNode;
    gte?: InputNode;
    lt?: InputNode;
    lte?: InputNode;
    ne?: InputNode;
    like?: LikeNode;
    nlike?: LikeNode;
    rlike?: LikeNode;
    in?: ArrayNode;
    nin?: ArrayNode;
    nil?: NullNode;
    not?: ResolverExpression;
    nor?: ResolverExpression;
    and?: ResolverExpression[];
    or?: ResolverExpression[];
}

export interface ResolverQuery extends ResolverExpression {
    order?: OrderNode;
    where?: string;
    offset?: number;
    limit?: number;
    exists?: boolean;
    skip?: number;
    take?: number;
}

export type ResolverArgs = any;

export interface ResolverContext {
    provider: EntityResolver;
    results?: Record<string, any[]>;
}

export type ResolverInfo = GraphQLResolveInfo;

export interface SchemaResolver {
    (obj: any, args: ResolverQuery & ResolverArgs, ctx: ResolverContext, info: ResolverInfo): Promise<any>;
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
    (entity: EntityMetadata, obj: any, args: ResolverQuery & ResolverArgs, ctx: ResolverContext, info: ResolverInfo): Promise<any>;
}

export interface QueryResolver {
    (entity: EntityMetadata, obj: ResolverArgs, args: ResolverArgs, context: ResolverContext, info?: ResolverInfo): Promise<any>;
}

export interface RelationResolver {
    (entity: EntityMetadata, rel: RelationMetadata, root: ResolverArgs, query: ResolverQuery, context?: ResolverContext, info?: ResolverInfo): Promise<any>;
}

