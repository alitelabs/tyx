import { DocumentNode } from 'graphql';
import { Context } from './core';
import { HttpRequest, HttpResponse } from './http';

// tslint:disable-next-line:variable-name
export const GraphQL = 'GraphQL';

export interface GraphQL {
  initialize(): void;
  execute(ctx: Context, source: string, variables?: Record<string, any>): Promise<any>;
  execute(ctx: Context, document: DocumentNode, variables?: Record<string, any>): Promise<any>;
  process(ctx: Context, req: HttpRequest): Promise<HttpResponse>;
}
