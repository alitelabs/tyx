import { Class, Context, Prototype } from '../types/core';
import { EventAdapter } from '../types/event';
import { HttpCode, HttpRequest } from '../types/http';
import { Roles } from '../types/security';
import * as Utils from '../utils/misc';
import { ApiMetadata, IApiMetadata } from './api';
import { Metadata } from './registry';
import { GraphKind, IInputMetadata, InputMetadata, InputType, IResultMetadata, ResultMetadata, ResultType, Select } from './type';

export enum HttpBindingType {
  PathParam = 'PathParam',
  PathParams = 'PathParams',
  QueryParam = 'QueryParam',
  QueryParams = 'QueryParams',
  HeaderParam = 'HeaderParam',
  BodyParam = 'BodyParam',
  ContextParam = 'ContextParam',
  // Objects
  Body = 'Body',
  ContextObject = 'ContextObject',
  RequestObject = 'RequestObject',
  RequestParam = 'RequestParam',
}

export type ContextBinder = (ctx: Context) => any;
export type RequestBinder = (req: HttpRequest) => any;
export type HttpBinder = (ctx: Context, req: HttpRequest) => any;

export type DesignMetadata = {
  name?: string;
  type: string;
  target: Function;
};

export type HttpAdapter = (
  next: (...args: any[]) => Promise<any>,
  ctx?: Context,
  req?: HttpRequest,
  path?: Record<string, string>,
  query?: Record<string, string>,
) => Promise<any>;

export interface HttpBindingMetadata {
  type: HttpBindingType;
  path: string;
  binder: HttpBinder;
}

export interface HttpRouteMetadata {
  target: Class;
  api: IApiMetadata;
  method: IMethodMetadata;

  route: string;
  alias: string;
  handler: string;
  // route: string;
  verb: string;
  resource: string;
  model: string;
  params: string[];
  code: HttpCode;
  adapter: HttpAdapter;
  // Relations
  // api: ApiMetadata;
  // method: MethodMetadata;
}

export namespace HttpRouteMetadata {
  export function route(verb: string, resource: string, model?: string) {
    return `${verb}:${resource}` + (model ? `:${model}` : '');
  }
}

export interface EventRouteMetadata {
  target: Class;
  api: IApiMetadata;
  method: IMethodMetadata;

  route: string;
  alias: string;
  handler: string;
  source: string;
  resource: string;
  objectFilter: string;
  actionFilter: string;
  adapter: EventAdapter;
}

export namespace EventRouteMetadata {
  export function route(source: string, resource: string) {
    return `${source}/${resource}`;
  }
}

export interface IMethodMetadata {
  target: Class;
  api: IApiMetadata;
  // Temporary, type extension point
  host: Class;

  name: string;
  alias: string;
  design: DesignMetadata[];

  auth: string;
  roles: Roles;

  query: boolean;
  mutation: boolean;
  resolver: boolean;
  input: IInputMetadata;
  result: IResultMetadata;
  select: Select;

  contentType: string;
  bindings: HttpBindingMetadata[];
  http: Record<string, HttpRouteMetadata>;
  events: Record<string, EventRouteMetadata>;

  source?: string;
}

export class MethodMetadata implements IMethodMetadata {

  public target: Class;
  public api: IApiMetadata;
  public host: Class;

  public alias: string = undefined;
  public name: string;
  public design: DesignMetadata[] = undefined;

  public auth: string = undefined;
  public roles: Roles = undefined;

  public query: boolean = undefined;
  public mutation: boolean = undefined;
  public resolver: boolean = undefined;
  public input: InputMetadata = undefined;
  public result: ResultMetadata = undefined;
  public select: Select = undefined;

  public contentType: string = undefined;
  public bindings: HttpBindingMetadata[] = undefined;
  public http: Record<string, HttpRouteMetadata> = undefined;
  public events: Record<string, EventRouteMetadata> = undefined;

  private constructor(target: Prototype, method: string) {
    this.target = target.constructor;
    this.name = method;
  }

  public static id(scope: string, name: string): string {
    return `${scope}.${name}`;
  }

  public static has(target: Prototype, propertyKey: string): boolean {
    return Reflect.hasMetadata(Metadata.TYX_METHOD, target, propertyKey);
  }

  public static get(target: Prototype, propertyKey: string): MethodMetadata {
    return Reflect.getMetadata(Metadata.TYX_METHOD, target, propertyKey);
  }

  public static define(
    target: Prototype,
    propertyKey: string,
    descriptor?: PropertyDescriptor,
  ): MethodMetadata {
    let meta = MethodMetadata.get(target, propertyKey);
    const ret = meta && meta.design && meta.design[meta.design.length - 1];
    if (ret && ret.name === '#return') return meta;
    if (!meta) {
      meta = new MethodMetadata(target, propertyKey);
      Reflect.defineMetadata(Metadata.TYX_METHOD, meta, target, propertyKey);
    }
    const names = descriptor ? Utils.getArgs(descriptor.value as any) : [];
    const params: any[] = Reflect.getMetadata(Metadata.DESIGN_PARAMS, target, propertyKey);
    const returns = Reflect.getMetadata(Metadata.DESIGN_RETURN, target, propertyKey);
    meta.design = meta.design || [];
    params.forEach((param, i) => meta.design[i] = {
      name: names[i],
      type: param && param.name || 'void',
      target: param,
    });
    meta.design[params.length] = {
      name: descriptor ? '#return' : undefined,
      type: returns && returns.name || 'void',
      target: returns,
    };
    ApiMetadata.define(target).addMethod(meta);
    return meta;
  }

  public addAuth(auth: string, addRoles: Roles): this {
    this.auth = auth;
    const roles = this.roles = { ...this.roles, ...addRoles };
    roles.Internal = roles.Internal === undefined ? true : !!roles.Internal;
    roles.External = roles.External === undefined ? false : !!roles.External;
    roles.Remote = roles.Remote === undefined ? true : !!roles.Internal;
    return this;
  }

  public setQuery(input?: InputType, result?: ResultType, select?: Select): this {
    this.query = true;
    return this.setSignature(input, result, select);
  }

  public setMutation(input?: InputType, result?: ResultType, select?: Select): this {
    this.mutation = true;
    return this.setSignature(input, result, select);
  }

  public setResolver(type: Class, input?: InputType, result?: ResultType, select?: Select): this {
    this.resolver = true;
    this.host = type;
    return this.setSignature(input, result, select);
  }

  private setSignature(input?: InputType, result?: ResultType, select?: Select): this {
    this.input = InputMetadata.of(input);
    this.result = ResultMetadata.of(result);
    this.select = select;
    if (this.design && this.design.length === 1 && !GraphKind.isVoid(this.input.kind)) {
      throw new TypeError(`Invalid input kind [${this.input.kind}], method [${this.target.name}.${this.name}] has no parameters`);
    }
    return this;
  }

  public setContentType(type: string): this {
    this.contentType = type;
    return this;
  }

  public addRoute(
    verb: string,
    resource: string,
    model: string,
    code: HttpCode,
    adapter?: HttpAdapter,
  ): this {
    const route = HttpRouteMetadata.route(verb, resource, model);
    this.http = this.http || {};
    if (this.http[route]) throw new TypeError(`Duplicate HTTP route: [${route}]`);
    const params = (resource.match(/\{([^}]+)\}/gi) || []).map(v => v.replace(/[\{\}]/g, ''));
    const meta: HttpRouteMetadata = {
      target: this.target,
      api: undefined,
      method: this,

      route,
      alias: this.alias,
      handler: this.name,
      verb,
      resource,
      model,
      params,
      code,
      adapter,
      // api: () => this.service,
      // method: () => this
    };
    ApiMetadata.define(this.target).addRoute(meta);
    this.http[route] = meta;
    return this;
  }

  public addBinding(index: number, type: HttpBindingType, path: string, binder: HttpBinder): this {
    this.bindings = this.bindings || [];
    this.bindings[index] = {
      ...this.bindings[index],
      type,
      path,
      binder,
    };
    return this;
  }

  public addEvent(
    source: string,
    resource: string,
    filterAction: string | boolean,
    filterObject: string,
    adapter: EventAdapter,
  ): this {
    const route = `${source}/${resource}`;
    const actionFilter = filterAction === true ? this.name : (filterAction || '*');
    const objectFilter = filterObject || '*';
    this.events = this.events || {};
    if (this.events[route]) throw new TypeError(`Duplicate event route: [${route}]`);
    const event: EventRouteMetadata = {
      target: this.target,
      api: undefined,
      method: this,

      route,
      alias: this.alias,
      handler: this.name,
      source,
      resource,
      actionFilter,
      objectFilter,
      adapter,
    };
    this.events[route] = event;
    this.addAuth('internal', { Internal: true, External: false, Remote: false });
    ApiMetadata.define(this.target).addEvent(event);
    return this;
  }

  public commit(api: ApiMetadata): this {
    this.api = api;
    this.alias = api.alias;
    const id = MethodMetadata.id(this.alias, this.name);
    Metadata.MethodMetadata[id] = this;
    if (this.http) {
      for (const [route, meta] of Object.entries(this.http)) {
        meta.api = api;
        meta.alias = this.alias;
        if (Metadata.HttpRouteMetadata[route] && Metadata.HttpRouteMetadata[route] !== meta) {
          throw new TypeError(`Duplicate HTTP route [${route}]`);
        }
        Metadata.HttpRouteMetadata[route] = meta;
      }
    }
    if (this.events) {
      for (const [route, meta] of Object.entries(this.events)) {
        meta.api = api;
        meta.alias = this.alias;
        const handlers = Metadata.EventRouteMetadata[route] = Metadata.EventRouteMetadata[route] || [];
        if (!handlers.includes(meta)) handlers.push(meta);
      }
    }
    return this;
  }
}
