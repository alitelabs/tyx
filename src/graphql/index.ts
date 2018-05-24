import { DocumentNode } from "graphql";
import gqlTag from "graphql-tag";
import "reflect-metadata";

export type GqlTag = (literals: any, ...placeholders: any[]) => DocumentNode;
export const gql: GqlTag = gqlTag;

export * from "./schema";
export * from "./query";
export * from "./typeorm";
export * from "./service";