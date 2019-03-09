import { Class, Prototype } from '../types/core';
import { ApiMetadata } from './api';
import { Metadata } from './registry';

export interface InjectMetadata {
  resource: string;
  target?: Class;
  index?: number;
}

export interface HandlerMetadata {
  service?: string;
  method: string;
  target: Class;

  source?: string;
}

export interface IServiceMetadata {
  target: Class;
  name: string;
  alias: string;

  dependencies: Record<string, InjectMetadata>;
  handlers: Record<string, HandlerMetadata>;

  initializer: HandlerMetadata;
  selector: HandlerMetadata;
  activator: HandlerMetadata;
  releasor: HandlerMetadata;

  source?: string;
}

export class ServiceMetadata implements IServiceMetadata {
  public target: Class;
  public name: string;
  public alias: string;
  public dependencies: Record<string, InjectMetadata> = {};
  public handlers: Record<string, HandlerMetadata> = {};

  public initializer: HandlerMetadata = undefined;
  public selector: HandlerMetadata = undefined;
  public activator: HandlerMetadata = undefined;
  public releasor: HandlerMetadata = undefined;

  constructor(target: Class) {
    this.target = target;
    this.name = target.name;
    this.alias = target.name; // .replace(/Service$/i, '');
  }

  public static has(target: Class | Prototype): boolean {
    return Reflect.hasMetadata(Metadata.TYX_SERVICE, target)
      || Reflect.hasMetadata(Metadata.TYX_SERVICE, target.constructor);
  }

  public static get(target: Class | Prototype): ServiceMetadata {
    return Reflect.getMetadata(Metadata.TYX_SERVICE, target)
      || Reflect.getMetadata(Metadata.TYX_SERVICE, target.constructor);
  }

  public static define(target: Class): ServiceMetadata {
    let meta = this.get(target);
    if (!meta) {
      meta = new ServiceMetadata(target);
      Reflect.defineMetadata(Metadata.TYX_SERVICE, meta, target);
    }
    return meta;
  }

  public inject(propertyKey: string, index: number, rsrc?: string | Class) {
    let resource = rsrc;
    if (!resource) {
      resource = Reflect.getMetadata(Metadata.DESIGN_TYPE, this.target.prototype, propertyKey);
    }
    let target: Function;
    if (resource instanceof Function) {
      target = resource;
      resource = resource.name;
    } else {
      target = undefined;
      resource = resource.toString();
    }
    const key = (propertyKey || '[constructor]') + (index !== undefined ? `#${index}` : '');
    this.dependencies[key] = { resource, target, index };
  }

  public addHandler(propertyKey: string, descriptor: PropertyDescriptor): this {
    if (this.handlers[propertyKey]) throw new TypeError(`Duplicate handler [${this.name}.${propertyKey}]`);
    this.handlers[propertyKey] = { method: propertyKey, target: descriptor.value };
    return this;
  }

  public setInitializer(propertyKey: string, descriptor: PropertyDescriptor): this {
    if (this.initializer) throw new TypeError(`Duplicate initializer [${this.name}.${propertyKey}]`);
    this.initializer = { method: propertyKey, target: descriptor.value };
    return this;
  }

  public setSelector(propertyKey: string, descriptor: PropertyDescriptor): this {
    if (this.selector) throw new TypeError(`Duplicate selector [${this.name}.${propertyKey}]`);
    this.selector = { method: propertyKey, target: descriptor.value };
    return this;
  }

  public setActivator(propertyKey: string, descriptor: PropertyDescriptor): this {
    if (this.activator) throw new TypeError(`Duplicate activator [${this.name}.${propertyKey}]`);
    this.activator = { method: propertyKey, target: descriptor.value };
    return this;
  }

  public setReleasor(propertyKey: string, descriptor: PropertyDescriptor): this {
    if (this.releasor) throw new TypeError(`Duplicate releasor [${this.name}.${propertyKey}]`);
    this.releasor = { method: propertyKey, target: descriptor.value };
    return this;
  }

  public commit(alias?: string): this {
    // TODO: Set service as this
    if (this.initializer) this.initializer.service = this.name;
    if (this.selector) this.selector.service = this.name;
    if (this.activator) this.activator.service = this.name;
    if (this.releasor) this.releasor.service = this.name;
    if (this.handlers) Object.values(this.handlers).forEach(item => item.service = this.name);
    const api = ApiMetadata.get(this.target);
    if (api) {
      // Stop service renaming an API until proper metadata inheritance is implemented
      if (alias && api.target !== this.target) throw TypeError('Service extending Api can not have alias');
      this.alias = alias || api.name;
      api.commit();
    } else {
      this.alias = alias || this.name;
    }
    const prev = Metadata.ServiceMetadata[this.alias];
    // TODO: Store by name, separate unique by alias
    if (prev && prev !== this) throw new TypeError(`Duplicate service alias [${this.alias}]`);
    Metadata.ServiceMetadata[this.alias] = this;
    return this;
  }
}
