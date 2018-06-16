import { Class, Prototype } from '../types/core';
import { EventRouteMetadata, HttpRouteMetadata, IMethodMetadata, MethodMetadata } from './method';
import { Registry } from './registry';

export interface IApiMetadata {
  target: Class;
  name: String;
  alias: string;

  methods: Record<string, IMethodMetadata>;
  routes: Record<string, HttpRouteMetadata>;
  events: Record<string, EventRouteMetadata[]>;

  source?: string;
}

export class ApiMetadata implements IApiMetadata {
  public target: Class;
  public name: string;
  public alias: string;

  public methods: Record<string, MethodMetadata> = {};
  public routes: Record<string, HttpRouteMetadata> = {};
  public events: Record<string, EventRouteMetadata[]> = {};

  constructor(target: Class) {
    this.target = target;
    this.name = target.name;
    this.alias = target.name.replace(/Api$/i, '');
  }

  public static has(target: Class | Prototype): boolean {
    return Reflect.hasMetadata(Registry.TYX_API, target)
      || Reflect.hasMetadata(Registry.TYX_API, target.constructor);
  }

  public static get(target: Class | Prototype): ApiMetadata {
    return Reflect.getMetadata(Registry.TYX_API, target)
      || Reflect.getMetadata(Registry.TYX_API, target.constructor);
  }

  public static define(target: Class | Prototype): ApiMetadata {
    let meta = ApiMetadata.get(target);
    if (!meta) {
      const trg = (typeof target === 'function') ? target : target.constructor;
      meta = new ApiMetadata(trg as Class);
      Reflect.defineMetadata(Registry.TYX_API, meta, trg);
    }
    return meta;
  }

  public addMethod(meta: MethodMetadata) {
    this.methods[meta.name] = meta;
  }

  public addRoute(meta: HttpRouteMetadata) {
    if (this.routes[meta.route]) throw new Error(`Duplicate route: ${meta.route}`);
    this.routes[meta.route] = meta;
  }

  public addEvent(meta: EventRouteMetadata) {
    this.events[meta.route] = this.events[meta.route] || [];
    this.events[meta.route].push(meta);
  }

  public commit(alias?: string): this {
    this.alias = alias || this.target.name;
    const prev = Registry.ApiMetadata[this.alias];
    if (prev && prev !== this) throw new TypeError(`Duplicate API alias [${this.alias}]`);
    Registry.ApiMetadata[this.alias] = this;
    Object.values(this.methods).forEach(item => item.commit(this));
    // this.schema();
    return this;
  }
}
