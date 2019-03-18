
import KoaKoa, { Context as KoaContext, Request as KoaRequest, Response as KoaResponse } from 'koa';
import KoaRouter, { IRouterOptions as KoaRouterOptions } from 'koa-router';

export namespace Koa {
  export interface Koa extends KoaKoa { }
  export interface Context extends KoaContext { }
  export interface Request extends KoaRequest { }
  export interface Response extends KoaResponse { }
  export interface Router extends KoaRouter { }
  export interface IRouterOptions extends KoaRouterOptions { }

  let koaClass: any = undefined;
  let routerClass: any = undefined;
  let rawBodyModule: any = undefined;

  export function load(req?: boolean): boolean {
    if (!req && koaClass !== undefined
      && routerClass !== undefined
      && rawBodyModule !== undefined
    ) return !!koaClass;
    try {
      koaClass = require('koa');
      routerClass = require('koa-router');
      rawBodyModule = require('raw-body');
    } catch (err) {
      koaClass = null;
      if (req) throw err;
    }
    return !!koaClass && !!routerClass && !!rawBodyModule;
  }

  export function create(): Koa {
    load(true);
    return new koaClass();
  }

  export function router(opts?: IRouterOptions): Router {
    load(true);
    return new routerClass();
  }

  export function rawBody(): (req: any) => Buffer {
    load(true);
    return rawBodyModule;
  }
}
