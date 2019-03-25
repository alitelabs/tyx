import { Class, Context } from '../types/core';
import { HttpCode, HttpRequest } from '../types/http';
import { ApiMetadata, IApiMetadata } from './api';
import { IMethodMetadata, MethodMetadata } from './method';
import { IServiceMetadata, ServiceMetadata } from './service';

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

export interface IHttpBindingMetadata {
  type: HttpBindingType;
  path: string;
  binder: HttpBinder;
}

export class HttpBindingMetadata implements IHttpBindingMetadata {
  public type: HttpBindingType;
  public path: string;
  public binder: HttpBinder;

  constructor(literal: Partial<IHttpBindingMetadata>) {
    Object.assign(this, literal);
  }

  public inherit(method: MethodMetadata): this {
    const copy = { ...this };
    Object.setPrototypeOf(copy, HttpBindingMetadata.prototype);
    return copy;
  }
}

export interface IHttpRouteMetadata {
  target: Class;
  api: IApiMetadata;
  method: IMethodMetadata;
  base: IHttpRouteMetadata;
  over: IHttpRouteMetadata;
  servicer: IServiceMetadata;

  route: string;
  verb: string;
  resource: string;
  model: string;
  params: string[];
  code: HttpCode;
}

export class HttpRouteMetadata implements IHttpRouteMetadata {

  public target: Class;
  public api: ApiMetadata;
  public method: MethodMetadata;
  public base: HttpRouteMetadata;
  public over: HttpRouteMetadata;
  public servicer: ServiceMetadata;

  public route: string;
  public verb: string;
  public resource: string;
  public model: string;
  public params: string[];
  public code: HttpCode;

  public static route(verb: string, resource: string, model?: string) {
    return `${verb}:${resource}` + (model ? `:${model}` : '');
  }

  constructor(literal: Partial<IHttpRouteMetadata>) {
    Object.assign(this, literal);
  }

  public inherit(method: MethodMetadata): this {
    const copy = { ...this };
    Object.setPrototypeOf(copy, HttpRouteMetadata.prototype);
    copy.base = this;
    copy.api = undefined;
    copy.method = method;
    copy.target = method.target;
    return copy;
  }

  public override(over: HttpRouteMetadata): this {
    if (!over) return this;
    this.over = over;
    this.route = this.route || over.route;
    this.verb = this.verb || over.verb;
    this.resource = this.resource || over.resource;
    this.model = this.model || over.model;
    this.params = this.params || over.params;
    this.code = this.code || over.code;
    return this;
  }
}
