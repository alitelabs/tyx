import { DocumentNode } from 'graphql';
import { Context, Request } from './core';
import { HttpRequest, HttpResponse } from './http';

// tslint:disable-next-line:variable-name
export const GraphQL = 'GraphQL';

export interface GraphRequest extends Request {
  type: 'graphql';
  application: string;
  obj: any;
  args: any;
  info: any;
  sourceIp: string;
  token: string;
}

export interface GraphQL {
  initialize(): void;
  execute(ctx: Context, source: string, variables?: Record<string, any>): Promise<any>;
  execute(ctx: Context, document: DocumentNode, variables?: Record<string, any>): Promise<any>;
  graphql(ctx: Context, req: HttpRequest): Promise<HttpResponse>;
}
