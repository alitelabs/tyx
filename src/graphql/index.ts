import { DocumentNode } from "graphql";
import gqlTag from "graphql-tag";
import "reflect-metadata";

export type GqlTag = (literals: any, ...placeholders: any[]) => DocumentNode;
export const gql: GqlTag = gqlTag;

export * from "./query";
export * from "./schema";
export * from "./service";
export * from "./typeorm";
export * from "./types";

