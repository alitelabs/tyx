// tslint:disable-next-line:max-line-length
import { getProtocol, getTransport, IProtocolConstructor, IThriftProcessor, ITransportConstructor, process, readThriftMethod } from '@creditkarma/thrift-server-core';
import { Auth } from '../decorators/auth';
import { ContentType, ContextObject, Get, Post, RequestObject } from '../decorators/http';
import { CoreService } from '../decorators/service';
import { Forbidden } from '../errors/http';
import { Logger } from '../logger';
import { ServiceMetadata } from '../metadata/service';
import { ThriftTools } from '../tools/thrift';
import { Context } from '../types/core';
import { HttpRequest, HttpResponse } from '../types/http';
import { Roles } from '../types/security';
import { ICoreThriftHandlerOptions, Thrift, ThriftContext } from '../types/thrift';

@CoreService(Thrift)
export class CoreThrift implements Thrift {

  public static init(roles: Roles) {
    Auth(roles)(
      CoreThrift.prototype,
      'definition',
      Object.getOwnPropertyDescriptor(CoreThrift.prototype, 'definition')
    );
    Auth(roles)(
      CoreThrift.prototype,
      'process',
      Object.getOwnPropertyDescriptor(CoreThrift.prototype, 'process')
    );
  }

  public static finalize() {
    ServiceMetadata.get(this).final = true;
  }

  // @Logger()
  protected log = Logger.get(this);
  private readonly handlers: Record<string, CoreThriftHandler<any>> = {};

  protected constructor(handlers: Record<string, IThriftProcessor<ThriftContext>>) {
    for (const serviceName in handlers) {
      const handler = handlers[serviceName];
      this.handlers[serviceName] = new CoreThriftHandler<any>({ serviceName, handler });
    }
    Object.freeze(this.handlers);
  }

  public initialize() { }

  @Get('/thrift')
  @ContentType(HttpResponse)
  public async definition(@ContextObject() ctx: Context, @RequestObject() req: HttpRequest): Promise<HttpResponse> {
    const result = ThriftTools.emit(Core.config.application);
    return {
      statusCode: 200,
      contentType: 'application/thrift-idl',
      body: result.thrift
    };
  }

  @Post('/thrift/{service}')
  @ContentType(HttpResponse)
  public async process(@ContextObject() ctx: Context, @RequestObject() req: HttpRequest): Promise<HttpResponse> {
    req.buffer = req.buffer || Buffer.from(req.body, req.isBase64Encoded ? 'base64' : 'binary');
    const service = req.pathParameters['service'];
    const handler = this.handlers[service];
    if (!handler) throw new Forbidden(`Unknown service [${service}]`);
    const result: Buffer = await handler.execute(req, ctx);
    return {
      statusCode: 200,
      contentType: 'application/octet-stream',
      body: result.toString('base64'),
      isBase64Encoded: true
    };
  }
}

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
