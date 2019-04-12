import { Utils } from 'exer';
import { CoreInstance } from '../core/instance';
import { Configuration } from '../types/config';
import { Class, Prototype } from '../types/core';
import { GraphQL } from '../types/graphql';
import { Security } from '../types/security';
import { Thrift } from '../types/thrift';
import { IEventRouteMetadata } from './event';
import { IHttpRouteMetadata } from './http';
import { IMethodMetadata, MethodMetadata } from './method';
import { MetadataRegistry, Registry } from './registry';
import { IServiceMetadata, ServiceMetadata } from './service';

export interface IApiMetadata {
  target: Class;
  name: string;
  alias: string;

  base: IApiMetadata;
  owner: IServiceMetadata;
  servicer: IServiceMetadata;
  services: Record<string, IServiceMetadata>;

  methods: Record<string, IMethodMetadata>;
  routes: Record<string, IHttpRouteMetadata>;
  events: Record<string, IEventRouteMetadata[]>;

  source?: string;
}

export class ApiMetadata implements IApiMetadata {
  public target: Class;
  public name: string;
  public alias: string;

  public base: ApiMetadata;
  public owner: ServiceMetadata;
  public servicer: ServiceMetadata;
  public services: Record<string, ServiceMetadata> = {};

  public methods: Record<string, MethodMetadata> = {};
  public routes: Record<string, IHttpRouteMetadata> = {};
  public events: Record<string, IEventRouteMetadata[]> = {};

  constructor(target: Class) {
    this.target = target;
    this.name = target.name;
  }

  public static has(target: Class | Prototype): boolean {
    return Reflect.hasOwnMetadata(MetadataRegistry.TYX_API, target)
      || Reflect.hasOwnMetadata(MetadataRegistry.TYX_API, target.constructor);
  }

  public static get(target: Class | Prototype): ApiMetadata {
    return Reflect.getOwnMetadata(MetadataRegistry.TYX_API, target)
      || Reflect.getOwnMetadata(MetadataRegistry.TYX_API, target.constructor);
  }

  public static define(target: Class): ApiMetadata {
    if (!Utils.isClass(target)) throw new TypeError('Not a class');
    let meta = ApiMetadata.get(target);
    if (meta) return meta;
    meta = new ApiMetadata(target);
    Reflect.defineMetadata(MetadataRegistry.TYX_API, meta, target);
    return meta;
  }

  public isCore() {
    return [Configuration, Security, GraphQL, Thrift].includes(this.alias);
  }

  public addMethod(meta: MethodMetadata) {
    if (this.methods[meta.name] && this.methods[meta.name] !== meta) throw TypeError(`Duplicate method: [${meta.name}]`);
    this.methods[meta.name] = meta;
  }

  public addRoute(meta: IHttpRouteMetadata) {
    if (this.routes[meta.route]) throw new Error(`Duplicate route: ${meta.route}`);
    this.routes[meta.route] = meta;
  }

  public addEvent(meta: IEventRouteMetadata) {
    this.events[meta.route] = this.events[meta.route] || [];
    this.events[meta.route].push(meta);
  }

  public addService(service: ServiceMetadata) {
    if (service.api !== this) throw new TypeError('Not an implementation');
    this.services[service.name] = service;
  }

  public commit(alias?: string): this {
    // TODO: Validations
    // - Abstract and all methods throw undefined
    // - Replace methods with stubs if not a service
    // - No double commit

    this.owner = ServiceMetadata.get(this.target) || null;
    this.alias = this.owner && this.owner.alias
      || alias
      || this.name; // .replace(/Api$/, '');

    const parent = Utils.baseClass(this.target);
    const sup = ApiMetadata.get(parent);
    const base = this.owner && this.owner.base && this.owner.base.api || null;
    if (base && base !== sup) throw TypeError('Assertion');
    if (sup && !sup.owner && this.owner) throw TypeError('Extends inline Api');

    this.inherit(base || sup);

    const prev = Registry.ApiMetadata[this.name];
    if (prev && prev !== this) throw new TypeError(`Duplicate API name [${this.name}]`);
    Registry.ApiMetadata[this.name] = this;
    Object.values(this.methods).forEach(m => m.commit(this));
    return this;
  }

  private inherit(base: ApiMetadata): this {
    if (!base) return this;
    this.base = base;
    for (const bm of Object.values(this.base.methods)) {
      const sup = bm.inherit(this);
      this.methods[sup.name] = sup.override(this.methods[sup.name]);
    }
    return this;
  }

  public publish(service: ServiceMetadata): this {
    if (this.base && !this.base.servicer) this.base.publish(service);
    if (this.servicer && this.servicer !== service) {
      // const parent = Utils.baseClass(service.target);
      if (this.servicer !== service.base) {
        throw new TypeError(`Duplicate Api implementation: [${service.name}] > [${this.servicer.name}]`);
      }
    }
    this.servicer = service;
    for (const method of Object.values(this.methods)) {
      method.publish(service);
    }
    return this;
  }

  public local(container: CoreInstance) {
    if (this.owner) return undefined;
    const obj: any = new (this.target as any)();
    for (const method of Object.values(this.methods)) {
      const value = method.local(container);
      Object.defineProperty(obj, method.name, { configurable: false, writable: false, value });
    }
    return obj;
  }
}
