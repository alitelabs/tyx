import { Express, Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { createServer, Server } from 'http';
import Koa, { Context as Kontext } from 'koa';
import Router from 'koa-router';
import { Core } from '../core/core';
import { HttpUtils } from '../core/http';
import { InternalServerError } from '../errors/http';
import { Logger } from '../logger';
import { Metadata } from '../metadata/registry';
import { HttpMethod, HttpRequest, HttpResponse } from '../types/http';
import { Utils } from '../utils';

export abstract class CoreServer extends Core {
  public static log: Logger = Logger.get('TYX', 'Server');

  public static HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,PATCH',
    'Access-Control-Allow-Headers': 'Origin, Content-Type, Content-Encoding, Accept, Authorization',
    'Access-Control-Expose-Headers': 'Token',
    // tslint:disable-next-line:object-literal-key-quotes
    // 'connection': 'close'
  };

  private static server: Server;

  public static start(port: number, basePath?: string, extraArgs?: any) {
    process.env.IS_OFFLINE = 'true';
    this.init();
    const app = CoreServer.koa(basePath || '/local');
    this.server = createServer(app.callback());
    // const app = CoreServer.express(basePath || '/local', extraArgs);
    // this.server = createServer(app);
    this.server.listen(port || 5000);
    this.log.info('👌  Server initialized.');
    CoreServer.paths(basePath || '/local').forEach(p => this.log.info(`${p.httpMethod} http://localhost:${port}${p.path}`));
    this.log.info('🚀  Server started at %s ...', port);
  }

  public static stop() {
    if (this.server) this.server.close();
    Core.release(true);
  }

  public static paths(basePath?: string) {
    const used: Record<string, boolean> = {};
    const paths: { httpMethod: string, path: string, resource: string }[] = [];
    for (const meta of Object.values(Metadata.HttpRouteMetadata)) {
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

  public static koa(basePath: string): Koa {
    const koaClass = require('koa');
    const routerClass = require('koa-router');
    const rawBody = require('raw-body');
    const app: Koa = new koaClass();
    const routes: Router = new routerClass();
    app.use(async (ctx, next) => {
      Object.entries(this.HEADERS).forEach(h => ctx.set(h[0], h[1]));
      return next();
    });
    for (const { httpMethod, path, resource } of this.paths(basePath)) {
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

  public static express(basePath: string, extraArgs: any = {}): Express {
    const express = require('express');
    const bodyParser = require('body-parser');
    const app: Express = express();
    app.use((req, res, next) => {
      Object.entries(this.HEADERS).forEach(h => res.setHeader(h[0], h[1]));
      next();
    });
    app.use(bodyParser.text({ type: ['*/json', 'text/*'], defaultCharset: 'utf-8', ...extraArgs }));
    for (const { httpMethod, path, resource } of this.paths(basePath)) {
      const adapter = this.expressMiddleware.bind(this, resource);
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

  public static async expressMiddleware(resource: string, req: ExpressRequest, res: ExpressResponse): Promise<void> {
    this.log.info('%s: %s', req.method, req.url);
    if (Buffer.isBuffer(req.body)) req.body = req.body.toString('utf-8');
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

      application: undefined,
      service: undefined,
      method: undefined,

      httpMethod: req.method as HttpMethod,
      resource,
      path: req.path,
      pathParameters: req.params || {},
      queryStringParameters: req.query || {},
      headers: req.headers as Record<string, string> || {},
      body: req.body,
      isBase64Encoded: false, // TODO
    };

    let result: HttpResponse;
    try {
      result = await Core.httpRequest(request);
    } catch (err) {
      result = HttpUtils.error(err);
    }

    for (const header in result.headers) {
      res.setHeader(header, result.headers[header]);
    }
    if (result.contentType) res.setHeader('Content-Type', result.contentType);
    res.status(result.statusCode).send(result.body);
  }

  public static async koaMiddleware(resource: string, rawBody: (req: any) => Buffer, ctx: Kontext): Promise<void> {
    this.log.info('%s: %s', ctx.method, ctx.url);
    const buffer: Buffer = await rawBody(ctx.req);
    const body = buffer.toString();

    const request: HttpRequest = {
      type: 'http',
      requestId: Utils.uuid(),
      sourceIp: ctx.ip || '255.255.255.255',

      application: undefined,
      service: undefined,
      method: undefined,

      httpMethod: ctx.method as HttpMethod,
      resource,
      path: ctx.path,
      pathParameters: { ...ctx.params },
      queryStringParameters: { ...ctx.query },
      headers: { ...ctx.headers },
      body,
      isBase64Encoded: false, // TODO
    };

    let result: HttpResponse;
    try {
      result = await Core.httpRequest(request);
    } catch (err) {
      result = HttpUtils.error(InternalServerError.wrap(err));
    }

    // Object.entries(this.HEADERS).forEach(h => ctx.set(h[0], h[1]));
    if (result.contentType) ctx.set('content-type', result.contentType);
    for (const header in result.headers) {
      ctx.set(header, result.headers[header]);
    }
    ctx.status = result.statusCode;
    ctx.body = result.body;
  }
}
