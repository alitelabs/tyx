import { gql as tag } from 'apollo-server-core';
import { DocumentNode } from 'graphql';
export { DocumentNode };

export function gql(literals: any, ...args: any[]): DocumentNode {
  return tag(literals, ...args);
}
