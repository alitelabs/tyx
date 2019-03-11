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
  graphql(ctx: Context, req: HttpRequest): Promise<HttpResponse>;
}
