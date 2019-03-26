import { CoreInstance } from '../core/instance';
import { Class, ClassRef, Context, Prototype, ResolverArgs, ResolverInfo, ResolverQuery } from '../types/core';
import { HttpCode } from '../types/http';
import { Roles } from '../types/security';
import * as Utils from '../utils/misc';
import { ApiMetadata, IApiMetadata } from './api';
import { EventRouteMetadata, IEventRouteMetadata } from './event';
import { HttpBinder, HttpBindingMetadata, HttpBindingType, HttpRouteMetadata, IHttpBindingMetadata, IHttpRouteMetadata } from './http';
import { IInputMetadata, InputMetadata } from './input';
import { Metadata, MetadataRegistry } from './registry';
import { IResultMetadata, ResultMetadata } from './result';
import { ServiceMetadata } from './service';
import { TypeSelect } from './type';
import { Any, Args, Info, InputType, Obj, ResultType } from './var';

export enum MethodType {
  Internal = 'Internal',
  Query = 'Query',
  Mutation = 'Mutation',
  Extension = 'Extension'
}

export interface IMethodMetadata {
  target: Class;
  name: string;

  api: IApiMetadata;
  base: IApiMetadata;
  type: MethodType;
  // Temporary, type extension point
  scope: ClassRef;

  auth: string;
  roles: Roles;

  inputs: IInputMetadata[];
  result: IResultMetadata;
  select: TypeSelect;

  contentType: string;
  bindings: IHttpBindingMetadata[];
  http: Record<string, IHttpRouteMetadata>;
  events: Record<string, IEventRouteMetadata>;

  source?: string;
}

export class MethodMetadata implements IMethodMetadata {

  public target: Class;
  public name: string;
  public type: MethodType;

  public api: ApiMetadata;
  public base: ApiMetadata;
  public over: MethodMetadata;
  public scope: ClassRef;

  public auth: string = undefined;
  public roles: Roles = undefined;

  public inputs: InputMetadata[] = [];
  public result: ResultMetadata = undefined;
  public select: TypeSelect = undefined;

  public contentType: string = undefined;
  public bindings: HttpBindingMetadata[] = undefined;
  public http: Record<string, HttpRouteMetadata> = undefined;
  public events: Record<string, EventRouteMetadata> = undefined;

  public get query(): boolean { return this.type === 'Query'; }
  public get mutation(): boolean { return this.type === 'Mutation'; }
  public get extension(): boolean { return this.type === 'Extension'; }

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
    this.auth = this.auth || over.auth;
    this.roles = this.roles || over.roles;

    this.type = this.type || over.type;

    // TODO: Merge inputs and result
    this.inputs = this.inputs || over.inputs;
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
    return Reflect.hasOwnMetadata(MetadataRegistry.TYX_METHOD, target, propertyKey);
  }

  public static get(target: Prototype, propertyKey: string): MethodMetadata {
    return Reflect.getOwnMetadata(MetadataRegistry.TYX_METHOD, target, propertyKey);
  }

  public static define(target: Prototype, propertyKey: string, descriptor?: PropertyDescriptor): MethodMetadata {
    if (!Utils.isClass(target.constructor)) throw new TypeError('Not a class');
    let meta = MethodMetadata.get(target, propertyKey);
    if (!meta) {
      meta = new MethodMetadata(target.constructor, propertyKey);
      Reflect.defineMetadata(MetadataRegistry.TYX_METHOD, meta, target, propertyKey);
      ApiMetadata.define(target.constructor).addMethod(meta);
    }

    // If resolved
    if (meta.result && meta.result.promise !== undefined) return meta;

    const names = descriptor && Utils.getArgs(descriptor.value as any);
    const params: any[] = Reflect.getMetadata(MetadataRegistry.DESIGN_PARAMS, target, propertyKey);
    const returns = Reflect.getMetadata(MetadataRegistry.DESIGN_RETURN, target, propertyKey);

    for (let i = 0; i < params.length; i++) {
      const param = params[i];
      const name = names && names[i] || `arg${i}`;
      const imeta = InputMetadata.of(param || [void 0]);
      let input = meta.inputs[i];
      if (!input) {
        input = imeta;
        meta.inputs[i] = input;
      }
      input.index = i;
      // input.kind = imeta.kind;
      input.name = name;
      input.design = param;
    }
    if (returns && names) {
      // TODO: Void
      const rmeta = ResultMetadata.of(returns || Any);
      if (!meta.result) {
        meta.result = rmeta;
      }
      // meta.result.kind = rmeta.kind;
      meta.result.design = returns;
      meta.result.promise = returns === Promise;
    }

    return meta;
  }

  public confirm(type: MethodType, host: ClassRef, inputs: InputType[], result: ResultType, select?: TypeSelect): this {
    // TODO: Wrap arguments
    if (type === MethodType.Extension && (!inputs || inputs.length === 0 || inputs.length === 1 && inputs[0] === void 0)) {
      // tslint:disable-next-line:no-parameter-reassignment
      inputs = [Obj, Args, Context, Info];
    }
    this.type = type;
    this.scope = host;
    this.select = select;
    if (inputs) inputs.forEach((inp, index) => this.setInput(index, inp));
    this.setResult(result);
    return this;
  }

  public addAuth(auth: string, addRoles: Roles): this {
    this.auth = auth;
    const roles = this.roles = { ...this.roles, ...addRoles };
    roles.Internal = roles.Internal === undefined ? true : !!roles.Internal;
    roles.External = roles.External === undefined ? false : !!roles.External;
    roles.Remote = roles.Remote === undefined ? true : !!roles.Internal;
    return this;
  }

  public setInput(index: number, type: InputType): InputMetadata {
    const over = InputMetadata.of(type);
    let input = this.inputs[index];
    if (!input) {
      input = over;
      this.inputs[index] = over;
    } else {
      // TODO: May be not overidde design type if non in decoration
      Object.assign(input, over);
    }
    input.defined = true;
    // TODO: Validate in registy that all inputs are defined
    return input;
  }

  public setResult(type: ResultType): ResultMetadata {
    const over = ResultMetadata.of(type);
    Object.assign(this.result, over);
    this.result.defined = true;
    // TODO: Validate in registy that all inputs are defined
    return this.result;
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
    Metadata.Method[id] = this;
    if (!api.owner && this.target === api.target) {
      const descriptor = Object.getOwnPropertyDescriptor(this.target.prototype, this.name);
      this.mustBeEmpty(descriptor.value);
      // descriptor.writable = false;
      // descriptor.configurable = false;
      this.target.prototype[this.name] = this.core();
    }
    return this;
  }

  private async mustBeEmpty(fun: Function) {
    try {
      await fun();
      throw new TypeError(`Api [${this.api.name}] non-empty implementation of [${this.name}]`);
    } catch (ex) {
      if (ex !== undefined) {
        throw new TypeError(`Api [${this.api.name}] non-empty implementation of [${this.name}]`);
      }
    }
  }

  public publish(service: ServiceMetadata): this {
    const id = MethodMetadata.id(this.api.name, this.name);
    // TODO: ---- Move this to service ....
    for (const [route, meta] of Object.entries(this.http || {})) {
      meta.api = this.api;
      meta.servicer = service;
      const prev = Metadata.HttpRoute[route];
      if (prev && prev !== meta && prev !== meta.base) {
        throw new TypeError(`Duplicate HTTP route [${route}]`);
      }
      if (prev && prev !== meta && prev === meta.base) {
        // TODO: Logger, from method to method
        console.log(`Route takeover [${route}]: [${MethodMetadata.id(prev.api.name, prev.method.name)}] -> [${id}]`);
      }
      Metadata.HttpRoute[route] = meta;
    }
    for (const [route, meta] of Object.entries(this.events || {})) {
      meta.api = this.api;
      meta.servicer = service;
      const handlers = Metadata.EventRoute[route] = Metadata.EventRoute[route] || [];
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

  public core(): Function {
    const fun = this.inputs.map(a => a.name);
    fun.push(`return function ${this.name}(${fun.join(',')}) {
      return global.Core.invoke('${this.api.name}', '${this.name}', ...arguments);
    }`);
    // tslint:disable-next-line:no-function-constructor-with-string-args
    const gen = new Function(...fun);
    return gen();
  }

  public local(container: CoreInstance): Function {
    const fun = this.inputs.map(a => a.name);
    fun.push(`return function ${this.name}(${fun.join(',')}) {
      return this.invoke('${this.api.name}', '${this.name}', ...arguments);
    }`);
    // tslint:disable-next-line:no-function-constructor-with-string-args
    const gen = new Function(...fun);
    return gen().bind(container);
  }

  public resolve(
    obj: any,
    args: ResolverQuery & ResolverArgs,
    ctx?: Context,
    info?: ResolverInfo,
  ): any[] {
    const params: any[] = [];
    for (const input of this.inputs) {
      params[input.index] = input.resolve(obj, args, ctx, info);
    }
    return params;
  }
}
