import { ContextBinder, HttpBinder, HttpBindingType, RequestBinder } from '../metadata/http';
import { MethodMetadata } from '../metadata/method';
import { Metadata } from '../metadata/registry';
import { HttpCode, HttpMethod, HttpResponse } from '../types/http';

// tslint:disable:function-name

export function Get(route: string): MethodDecorator {
  return HttpMethod(Get, route, false, 200);
}

export function Post(route: string, model?: boolean | string): MethodDecorator {
  return HttpMethod(Post, route, model, 200);
}

export function Put(route: string, model?: boolean | string): MethodDecorator {
  return HttpMethod(Put, route, model, 200);
}

export function Delete(route: string, model?: boolean | string): MethodDecorator {
  return HttpMethod(Delete, route, model, 200);
}

export function Patch(route: string, model?: boolean | string): MethodDecorator {
  return HttpMethod(Patch, route, model, 200);
}

// Decorator
function HttpMethod(
  decorator: Function,
  resource: string,
  model: boolean | string,
  code: HttpCode
): MethodDecorator {
  return Metadata.onMethod(decorator, { resource, model, code }, (target, propertyKey, descriptor) => {
    const verb = decorator.name.toUpperCase();
    let mod: string;
    if (!model) mod = undefined;
    else if (model === true) mod = propertyKey as string;
    else mod = model.toString();
    MethodMetadata.define(target, propertyKey as string, descriptor).addRoute(verb, resource, mod, code);
  });

}

/////////// Parameter Decorators //////////////////////////////////////////////////////////////////

export function PathParam(path: string): ParameterDecorator {
  return HttpBinding(PathParam, HttpBindingType.PathParam, path, (ctx, req) => req.pathParameters[path]);
}

export function PathParams(): ParameterDecorator {
  return HttpBinding(PathParams, HttpBindingType.PathParams, '*', (ctx, req) => req.pathParameters);
}

export function QueryParam(path: string): ParameterDecorator {
  return HttpBinding(QueryParam, HttpBindingType.QueryParam, path, (ctx, req) => req.queryStringParameters[path]);
}

export function QueryParams(): ParameterDecorator {
  return HttpBinding(QueryParams, HttpBindingType.QueryParams, '*', (ctx, req) => req.queryStringParameters);
}

export function BodyParam(path: string): ParameterDecorator {
  return HttpBinding(BodyParam, HttpBindingType.BodyParam, path, (ctx, req) => resolvePath(req.json, path));
}

export function HeaderParam(path: string): ParameterDecorator {
  return HttpBinding(HeaderParam, HttpBindingType.HeaderParam, path, (ctx, req) => req.headers[('' + path).toLowerCase()]);
}

// export function CookieParam(param: string) {}

export function Body(): ParameterDecorator {
  return HttpBinding(Body, HttpBindingType.Body, undefined, (ctx, req) => req.json);
}

export function ContextObject(): ParameterDecorator {
  return HttpBinding(ContextObject, HttpBindingType.ContextObject, undefined, (ctx, req) => ctx);
}

export function ContextParam(path: string | ContextBinder): ParameterDecorator {
  return HttpBinding(
    ContextParam,
    HttpBindingType.ContextParam,
    path instanceof Function ? '[Function]' : path,
    (ctx, req) => resolvePath(ctx, path),
  );
}

export function RequestObject(): ParameterDecorator {
  return HttpBinding(RequestObject, HttpBindingType.RequestObject, undefined, (ctx, req) => req);
}

export function RequestParam(path: string | RequestBinder): ParameterDecorator {
  return HttpBinding(
    RequestParam,
    HttpBindingType.RequestParam,
    path instanceof Function ? '[Function]' : path,
    (ctx, req) => resolvePath(req, path),
  );
}

function HttpBinding(decorator: Function, type: HttpBindingType, path: string, binder: HttpBinder): ParameterDecorator {
  return Metadata.onParameter(decorator, { path, binder }, (target, propertyKey, index) => {
    MethodMetadata.define(target, propertyKey as string).addBinding(index, type, path, binder);
  });
}

export function ContentType(contentType: string | typeof HttpResponse): MethodDecorator {
  return Metadata.onMethod(ContentType, { contentType }, (target, propertyKey) => {
    MethodMetadata.define(target, propertyKey as string).setContentType(contentType);
  });
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
