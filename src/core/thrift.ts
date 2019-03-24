// tslint:disable-next-line:max-line-length
import { getProtocol, getTransport, IProtocolConstructor, IThriftProcessor, IThriftServerOptions, ITransportConstructor, process, readThriftMethod } from '@creditkarma/thrift-server-core';
import { Context } from '../types/core';
import { HttpRequest } from '../types/http';
// import rawBody = require('raw-body');

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

// tslint:disable-next-line:function-name
export class CoreThriftHandler<TProcessor extends IThriftProcessor<ThriftContext>> {
  private pluginOptions: ICoreThriftHandlerOptions<TProcessor>;
  private transport: ITransportConstructor;
  private protocol: IProtocolConstructor;

  constructor(pluginOptions: ICoreThriftHandlerOptions<TProcessor>) {
    this.pluginOptions = pluginOptions;
    this.transport = getTransport(pluginOptions.transport);
    this.protocol = getProtocol(pluginOptions.protocol);
  }

  public async execute(req: HttpRequest, ctx: ThriftContext): Promise<any> {
    const buffer: Buffer = Buffer.from(req.buffer); // await rawBody(context.req);
    const method: string = readThriftMethod(buffer, this.transport, this.protocol);
    ctx.thrift = {
      requestMethod: method,
      processor: this.pluginOptions.handler,
      transport: this.pluginOptions.transport || 'buffered',
      protocol: this.pluginOptions.protocol || 'binary',
    };
    const result = await process({
      processor: this.pluginOptions.handler,
      buffer,
      Transport: this.transport,
      Protocol: this.protocol,
      context: ctx
    });
    return result;
  }
}
