import { ContextBinder, HttpAdapter, HttpBinder, HttpBindingType, MethodMetadata, RequestBinder } from '../metadata/method';
import { Metadata } from '../metadata/registry';
import { HttpCode, HttpMethod, HttpResponse } from '../types/http';

// tslint:disable:function-name

export function Get(route: string, adapter?: HttpAdapter): MethodDecorator {
  return HttpMethod(Get, route, false, 200, adapter);
}

export function Post(route: string, model?: boolean | string, adapter?: HttpAdapter): MethodDecorator {
  return HttpMethod(Post, route, model, 200, adapter);
}

export function Put(route: string, model?: boolean | string, adapter?: HttpAdapter): MethodDecorator {
  return HttpMethod(Put, route, model, 200, adapter);
}

export function Delete(route: string, model?: boolean | string, adapter?: HttpAdapter): MethodDecorator {
  return HttpMethod(Delete, route, model, 200, adapter);
}

export function Patch(route: string, model?: boolean | string, adapter?: HttpAdapter): MethodDecorator {
  return HttpMethod(Patch, route, model, 200, adapter);
}

// Decorator
function HttpMethod(
  decorator: Function,
  resource: string,
  model: boolean | string,
  code: HttpCode,
  adapter?: HttpAdapter,
): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    Metadata.trace(decorator, { resource, model, code, adapter }, target, propertyKey);
    if (typeof propertyKey !== 'string') throw new TypeError('propertyKey must be string');
    const verb = decorator.name.toUpperCase();
    let mod: string;
    if (!model) mod = undefined;
    else if (model === true) mod = propertyKey;
    else mod = model.toString();
    MethodMetadata.define(target, propertyKey).addRoute(verb, resource, mod, code, adapter);
  };
}

/////////// Parameter Decorators //////////////////////////////////////////////////////////////////

export function PathParam(path: string): ParameterDecorator {
  return HttpBinding(HttpBindingType.PathParam, path, (ctx, req) => req.pathParameters[path]);
}

export function PathParams(): ParameterDecorator {
  return HttpBinding(HttpBindingType.PathParams, '*', (ctx, req) => req.pathParameters);
}

export function QueryParam(path: string): ParameterDecorator {
  return HttpBinding(HttpBindingType.QueryParam, path, (ctx, req) => req.queryStringParameters[path]);
}

export function QueryParams(): ParameterDecorator {
  return HttpBinding(HttpBindingType.QueryParams, '*', (ctx, req) => req.queryStringParameters);
}

export function BodyParam(path: string): ParameterDecorator {
  return HttpBinding(HttpBindingType.BodyParam, path, (ctx, req) => resolvePath(req.json, path));
}

export function HeaderParam(path: string): ParameterDecorator {
  return HttpBinding(HttpBindingType.HeaderParam, path, (ctx, req) => req.headers[('' + path).toLowerCase()]);
}

// export function CookieParam(param: string) {}

export function Body(): ParameterDecorator {
  return HttpBinding(HttpBindingType.Body, undefined, (ctx, req) => req.json);
}

export function ContextObject(): ParameterDecorator {
  return HttpBinding(HttpBindingType.ContextObject, undefined, (ctx, req) => ctx);
}

export function ContextParam(path: string | ContextBinder): ParameterDecorator {
  return HttpBinding(
    HttpBindingType.ContextParam,
    path instanceof Function ? '[Function]' : path,
    (ctx, req) => resolvePath(ctx, path),
  );
}

export function RequestObject(): ParameterDecorator {
  return HttpBinding(HttpBindingType.RequestObject, undefined, (ctx, req) => req);
}

export function RequestParam(path: string | RequestBinder): ParameterDecorator {
  return HttpBinding(
    HttpBindingType.RequestParam,
    path instanceof Function ? '[Function]' : path,
    (ctx, req) => resolvePath(req, path),
  );
}

function HttpBinding(type: HttpBindingType, path: string, binder: HttpBinder): ParameterDecorator {
  return function (target, propertyKey, index) {
    Metadata.trace(type, { path, binder }, target, propertyKey, index);
    if (typeof propertyKey !== 'string') throw new TypeError('propertyKey must be string');
    MethodMetadata.define(target, propertyKey).addBinding(index, type, path, binder);
  };
}

export function ContentType(contentType: string | typeof HttpResponse): MethodDecorator {
  return function (target, propertyKey, descriptor) {
    Metadata.trace(ContentType, { contentType }, target, propertyKey);
    if (typeof propertyKey !== 'string') throw new TypeError('propertyKey must be string');
    MethodMetadata.define(target, propertyKey).setContentType(contentType);
  };
}

export function resolvePath(root: any, path: Function | string): any {
  if (typeof path === 'function') return path(root);
  if (!path) return undefined;
  const parts = path.toString().split('.');
  let val = root;
  for (const p of parts) {
    val = val && val[p];
  }
  return val;
}
