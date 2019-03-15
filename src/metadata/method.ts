import { Class, ClassRef, Prototype } from '../types/core';
import { HttpCode } from '../types/http';
import { Roles } from '../types/security';
import * as Utils from '../utils/misc';
import { ApiMetadata, IApiMetadata } from './api';
import { EventRouteMetadata, IEventRouteMetadata } from './event';
import { HttpBinder, HttpBindingMetadata, HttpBindingType, HttpRouteMetadata, IHttpBindingMetadata, IHttpRouteMetadata } from './http';
import { Metadata } from './registry';
import { ServiceMetadata } from './service';
import { GraphKind, IInputMetadata, InputMetadata, InputType, IResultMetadata, ResultMetadata, ResultType, Select } from './type';

export type IDesignMetadata = {
  name?: string;
  type: string;
  target: Function;
};

export interface IMethodMetadata {
  target: Class;
  api: IApiMetadata;
  base: IApiMetadata;
  // Temporary, type extension point
  host: Class;

  name: string;
  design: IDesignMetadata[];

  auth: string;
  roles: Roles;

  query: boolean;
  mutation: boolean;
  resolver: boolean;
  input: IInputMetadata;
  result: IResultMetadata;
  select: Select;

  contentType: string;
  bindings: IHttpBindingMetadata[];
  http: Record<string, IHttpRouteMetadata>;
  events: Record<string, IEventRouteMetadata>;

  source?: string;
}

export class MethodMetadata implements IMethodMetadata {

  public target: Class;
  public api: ApiMetadata;
  public base: ApiMetadata;
  public over: MethodMetadata;
  public host: ClassRef;

  public name: string;
  public design: IDesignMetadata[] = undefined;

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

  public inherit(api: ApiMetadata): this {
    const copy = { ...this };
    Object.setPrototypeOf(copy, MethodMetadata.prototype);
    copy.base = copy.api;
    copy.api = api;
    for (const [key, val] of Object.entries(this.http || {})) {
      this.http[key] = val.inherit(copy);
      val.method = this;
    }
    for (const [key, val] of Object.entries(this.events || {})) {
      this.events[key] = val.inherit(copy);
      val.method = this;
    }
    return copy;
  }

  public override(over: MethodMetadata): this {
    if (!over) return this;

    // TODO: Implement
    this.over = over;
    this.target = over.target;
    this.design = over.design;
    this.auth = this.auth || over.auth;
    this.roles = this.roles || over.roles;

    this.query = this.query || over.query;
    this.mutation = this.mutation || over.mutation;
    this.resolver = this.resolver || over.resolver;
    this.input = this.input || over.input;
    this.result = this.result || over.result;
    this.select = this.select || over.select;
    this.contentType = this.contentType || over.contentType;
    this.bindings = this.bindings || over.bindings;

    for (const [key, val] of Object.entries(over.http || {})) {
      this.http[key].override(val);
    }
    for (const [key, val] of Object.entries(over.events || {})) {
      this.events[key].override(val);
    }
    return this;
  }

  private constructor(target: Class, method: string) {
    this.target = target;
    this.name = method;
  }

  public static id(scope: string, name: string): string {
    return `${scope}.${name}`;
  }

  public static has(target: Prototype, propertyKey: string): boolean {
    return Reflect.hasOwnMetadata(Metadata.TYX_METHOD, target, propertyKey);
  }

  public static get(target: Prototype, propertyKey: string): MethodMetadata {
    return Reflect.getOwnMetadata(Metadata.TYX_METHOD, target, propertyKey);
  }

  public static define(target: Prototype, propertyKey: string, descriptor?: PropertyDescriptor): MethodMetadata {
    if (!Utils.isClass(target.constructor)) throw new TypeError('Not a class');
    let meta = MethodMetadata.get(target, propertyKey);
    if (!meta) {
      meta = new MethodMetadata(target.constructor, propertyKey);
      Reflect.defineMetadata(Metadata.TYX_METHOD, meta, target, propertyKey);
    }

    // If resolved
    const ret = meta.design && meta.design[meta.design.length - 1];
    if (ret && ret.name === '#return') return meta;

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
    ApiMetadata.define(target.constructor).addMethod(meta);
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

  public setResolver(type: ClassRef, input?: InputType, result?: ResultType, select?: Select): this {
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
    code: HttpCode
  ): this {
    const route = HttpRouteMetadata.route(verb, resource, model);
    this.http = this.http || {};
    if (this.http[route]) throw new TypeError(`Duplicate HTTP route: [${route}]`);
    const params = (resource.match(/\{([^}]+)\}/gi) || []).map(v => v.replace(/[\{\}]/g, ''));
    const meta = new HttpRouteMetadata({
      target: this.target,
      api: undefined,
      method: this,

      route,
      handler: this.name,
      verb,
      resource,
      model,
      params,
      code
    });
    ApiMetadata.define(this.target).addRoute(meta);
    this.http[route] = meta;
    return this;
  }

  public addBinding(index: number, type: HttpBindingType, path: string, binder: HttpBinder): this {
    this.bindings = this.bindings || [];
    this.bindings[index] = new HttpBindingMetadata({
      ...this.bindings[index],
      type,
      path,
      binder
    });
    return this;
  }

  public addEvent(
    source: string,
    resource: string,
    filterAction: string | boolean,
    filterObject: string
  ): this {
    // TODO Include action in route to allow multiple events per method
    const route = `${source}/${resource}`;
    const actionFilter = filterAction === true ? this.name : (filterAction || '*');
    const objectFilter = filterObject || '*';
    this.events = this.events || {};
    if (this.events[route]) throw new TypeError(`Duplicate event route: [${route}]`);
    const event = new EventRouteMetadata({
      target: this.target,
      api: undefined,
      method: this,

      route,
      handler: this.name,
      source,
      resource,
      actionFilter,
      objectFilter
    });
    this.events[route] = event;
    this.addAuth('internal', { Internal: true, External: false, Remote: false });
    ApiMetadata.define(this.target).addEvent(event);
    return this;
  }

  public commit(api: ApiMetadata): this {
    this.api = api;
    const id = MethodMetadata.id(this.api.name, this.name);
    Metadata.MethodMetadata[id] = this;
    return this;
  }

  public publish(service: ServiceMetadata): this {
    const id = MethodMetadata.id(this.api.name, this.name);
    // TODO: ---- Move this to service ....
    for (const [route, meta] of Object.entries(this.http || {})) {
      meta.api = this.api;
      meta.service = service;
      const prev = Metadata.HttpRouteMetadata[route];
      if (prev && prev !== meta && prev !== meta.base) {
        throw new TypeError(`Duplicate HTTP route [${route}]`);
      }
      if (prev && prev !== meta && prev === meta.base) {
        // TODO: Logger, from method to method
        console.log(`Route takeover [${route}]: [${MethodMetadata.id(prev.api.name, prev.method.name)}] -> [${id}]`);
      }
      Metadata.HttpRouteMetadata[route] = meta;
    }
    for (const [route, meta] of Object.entries(this.events || {})) {
      meta.api = this.api;
      meta.service = service;
      const handlers = Metadata.EventRouteMetadata[route] = Metadata.EventRouteMetadata[route] || [];
      // TODO: handlers.includes(meta.over)
      const prevIndex = handlers.indexOf(meta.base);
      if (prevIndex !== -1) {
        const prev = handlers[prevIndex];
        console.log(`Event takeover [${route}]: [${MethodMetadata.id(prev.method.api.name, prev.method.name)}] -> [${id}]`);
        handlers[prevIndex] = meta;
      } else if (!handlers.includes(meta)) {
        handlers.push(meta);
      }
    }
    return this;
  }
}
