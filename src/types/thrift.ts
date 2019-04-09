import { IThriftProcessor, IThriftServerOptions } from '@creditkarma/thrift-server-core';
import { Context } from './core';
import { HttpRequest, HttpResponse } from './http';

// tslint:disable-next-line:variable-name
export const Thrift = 'Thrift';

export interface ThriftContext extends Context {
  thrift?: {
    requestMethod: string
    processor: IThriftProcessor<ThriftContext>
    transport: string
    protocol: string
  };
}

export type ICoreThriftHandlerOptions<
  TProcessor extends IThriftProcessor<ThriftContext>
  > = IThriftServerOptions<ThriftContext, TProcessor>;

export interface Thrift {
  initialize(): void;
  definition(ctx: Context, req: HttpRequest): Promise<HttpResponse>;
  process(ctx: Context, req: HttpRequest): Promise<HttpResponse>;
}
