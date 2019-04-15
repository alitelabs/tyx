import { DatabaseMetadata } from "../metadata/database";
import { EntityMetadata } from "../metadata/entity";
import { RelationMetadata } from "../metadata/relation";
import { Context, ResolverArgs, ResolverInfo, ResolverQuery } from "../types/core";

export interface EntityResolver {
  metadata: DatabaseMetadata;
  get: EntityQueryResolver;
  search: EntityQueryResolver;
  create: EntityMutationResolver;
  update: EntityMutationResolver;
  remove: EntityMutationResolver;
  oneToMany: EntityRelationResolver;
  oneToOne: EntityRelationResolver;
  manyToOne: EntityRelationResolver;
  manyToMany: EntityRelationResolver;
}

export interface EntityMutationResolver {
  (
    entity: EntityMetadata,
    obj: any,
    args: ResolverQuery & ResolverArgs,
    ctx: Context,
    info?: ResolverInfo,
  ): Promise<any>;
}

export interface EntityQueryResolver {
  (
    entity: EntityMetadata,
    obj: ResolverArgs,
    args: ResolverArgs,
    ctx: Context,
    info?: ResolverInfo,
  ): Promise<any>;
}

export interface EntityRelationResolver {
  (
    entity: EntityMetadata,
    rel: RelationMetadata,
    root: ResolverArgs,
    query: ResolverQuery,
    ctx?: Context,
    info?: ResolverInfo,
  ): Promise<any>;
}
