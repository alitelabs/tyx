import { Utils } from 'exer';
import { createServer, Server } from 'http';
import { Core } from '../core/core';
import { HttpUtils } from '../core/http';
import { InternalServerError } from '../errors/http';
import { Express } from '../import/express';
import { Koa } from '../import/koa';
import { Logger } from '../logger';
import { Registry } from '../metadata/registry';
import { Env } from '../types/env';
import { HttpMethod, HttpRequest, HttpResponse } from '../types/http';

export interface CoreServerPath {
  httpMethod: string;
  path: string;
  resource: string;
}

export abstract class CoreServer {
  @Logger('TYX', 'Server')
  public static log: Logger;

  public static HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,PATCH',
    'Access-Control-Allow-Headers': 'Origin, Content-Type, Content-Encoding, Accept, Authorization',
    'Access-Control-Expose-Headers': 'Token',
    // tslint:disable-next-line:object-literal-key-quotes
    // 'connection': 'close'
  };

  private static server: Server;

  public static async start(port: number, basePath?: string, extraArgs?: any): Promise<Server> {
    Env.isOffline = true;
    await Core.init();
    const paths = CoreServer.paths(basePath);
    if (Koa.load()) {
      const app = CoreServer.koa(paths);
      this.server = createServer(app.callback());
    } else if (Express.load()) {
      const app = CoreServer.express(extraArgs, paths);
      this.server = createServer(app);
    } else {
      this.log.error('🛑  Neither koa or express installed.');
      return undefined;
    }
    this.server.listen(port || 5000);
    this.log.info('👌  Server initialized.');
    paths.forEach(p => this.log.info(`${p.httpMethod} http://localhost:${port}${p.path}`));
    this.log.info('🚀  Server started at %s ...', port);
    return this.server;
  }

  public static stop() {
    Env.isOffline = null;
    if (this.server) this.server.close();
  }

  public static paths(basePath?: string): CoreServerPath[] {
    const used: Record<string, boolean> = {};
    const paths: CoreServerPath[] = [];
    for (const meta of Object.values(Registry.HttpRouteMetadata)) {
      const httpMethod = meta.verb;
      const resource = meta.resource;
      // TODO: Regex
      let parts = resource.split('{');
      parts = parts.map(p => p.replace('}', ''));
      let path = parts.join(':');
      // this.log.info("Add route: %s >> %s", hd, path);
      const baseRoute = `${httpMethod} ${path}`;
      if (used[baseRoute]) continue;
      if (!meta.method.auth) {
        this.log.info('Auth missing:', baseRoute);
        continue;
      }
      used[baseRoute] = true;
      if (basePath) path = basePath + path;
      paths.push({ httpMethod, path, resource });
    }
    return paths;
  }

  public static koa(baseOrPaths?: string | CoreServerPath[]): Koa.Koa {
    const basePath = (typeof baseOrPaths === 'string') ? baseOrPaths : '';
    const paths = Array.isArray(baseOrPaths) ? baseOrPaths : this.paths(basePath);
    const app = Koa.create();
    const routes = Koa.router();
    const rawBody = Koa.rawBody();
    app.use(async (ctx, next) => {
      Object.entries(this.HEADERS).forEach(h => ctx.set(h[0], h[1]));
      return next();
    });
    for (const { httpMethod, path, resource } of paths) {
      const adapter = this.koaMiddleware.bind(this, resource, rawBody);
      switch (httpMethod) {
        case 'GET':
          routes.get(path, adapter); break;
        case 'POST':
          routes.post(path, adapter); break;
        case 'PUT':
          routes.put(path, adapter); break;
        case 'PATCH':
          routes.patch(path, adapter); break;
        case 'DELETE':
          routes.delete(path, adapter); break;
        default: throw new InternalServerError(`Unsupported http method: ${httpMethod}`);
      }
    }
    app.use(routes.routes());
    app.use(routes.allowedMethods());
    return app;
  }

  public static express(extraArgs: any, baseOrPaths?: string | CoreServerPath[]): Express.Express {
    const basePath = (typeof baseOrPaths === 'string') ? baseOrPaths : '';
    const paths = Array.isArray(baseOrPaths) ? baseOrPaths : this.paths(basePath);
    const app: Express.Express = Express.create();
    app.use((req, res, next) => {
      Object.entries(this.HEADERS).forEach(h => res.setHeader(h[0], h[1]));
      next();
    });
    app.use(Express.bodyParser().text({ type: ['*/json', 'text/*'], defaultCharset: 'utf-8', ...extraArgs }));
    for (const { httpMethod, path, resource } of paths) {
      const adapter = this.expressMiddleware.bind(resource);
      switch (httpMethod) {
        case 'GET':
          app.get(path, adapter); break;
        case 'POST':
          app.post(path, adapter); break;
        case 'PUT':
          app.put(path, adapter); break;
        case 'PATCH':
          app.patch(path, adapter); break;
        case 'DELETE':
          app.delete(path, adapter); break;
        default: throw new InternalServerError(`Unsupported http method: ${httpMethod}`);
      }
    }
    return app;
  }

  // TODO: Test it
  public static async expressMiddleware(resource: string, req: Express.Request, res: Express.Response): Promise<void> {
    this.log.info('%s: %s', req.method, req.url);
    let buffer: Buffer;
    if (Buffer.isBuffer(req.body)) {
      buffer = req.body;
      req.body = req.body.toString('utf-8');
    }
    if (req.body instanceof Object) {
      if (Object.getOwnPropertyNames(req.body).length) {
        req.body = JSON.stringify(req.body);
      } else {
        req.body = undefined;
      }
    }

    const request: HttpRequest = {
      type: 'http',
      requestId: Utils.uuid(),
      sourceIp: req.ip || '255.255.255.255',

      service: undefined,
      method: undefined,

      httpMethod: req.method as HttpMethod,
      resource,
      path: req.path,
      pathParameters: req.params || {},
      queryStringParameters: req.query || {},
      headers: req.headers as Record<string, string> || {},
      body: req.body,
      buffer,
      isBase64Encoded: false, // TODO
    };

    let result: HttpResponse;
    try {
      result = await new Promise((resolve, reject) => {
        setImmediate(async () => {
          (await Core.get()).httpRequest(request).then(resolve).catch(reject);
        });
      });
    } catch (err) {
      result = HttpUtils.error(err);
    }

    for (const header in result.headers) {
      res.setHeader(header, result.headers[header]);
    }
    if (result.contentType) res.setHeader('Content-Type', result.contentType);
    res.status(result.statusCode).send(result.body);
  }

  public static async koaMiddleware(resource: string, rawBody: (req: any) => Buffer, ctx: Koa.Context): Promise<void> {
    this.log.info('%s: %s', ctx.method, ctx.url);
    const buffer: Buffer = await rawBody(ctx.req);
    const utf = ctx.is('json', 'text');
    // TODO: Check encoding, raw data with BINARY
    const body = buffer.toString(utf ? 'utf-8' : 'BINARY');

    const request: HttpRequest = {
      type: 'http',
      requestId: Utils.uuid(),
      sourceIp: ctx.ip || '255.255.255.255',

      service: undefined,
      method: undefined,

      httpMethod: ctx.method as HttpMethod,
      resource,
      path: ctx.path,
      pathParameters: ctx.params,
      queryStringParameters: ctx.query,
      headers: ctx.headers,
      body,
      buffer,
      isBase64Encoded: false, // TODO
    };

    let result: HttpResponse;
    try {
      result = await new Promise((resolve, reject) => {
        setImmediate(async () => {
          (await Core.get()).httpRequest(request).then(resolve).catch(reject);
        });
      });
    } catch (err) {
      result = HttpUtils.error(InternalServerError.wrap(err));
    }

    // Object.entries(this.HEADERS).forEach(h => ctx.set(h[0], h[1]));
    if (result.contentType) ctx.set('content-type', result.contentType);
    for (const header in result.headers) {
      ctx.set(header, result.headers[header]);
    }
    ctx.status = result.statusCode;
    if (result.isBase64Encoded) {
      ctx.body = Buffer.from(result.body, 'base64');
    } else {
      ctx.body = result.body;
    }
  }
}
