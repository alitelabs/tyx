import { Utils } from 'exer';
import { Class, ClassRef, Prototype } from '../types/core';
import { ApiMetadata, IApiMetadata } from './api';
import { MetadataRegistry, Registry } from './registry';

export interface IInjectMetadata {
  host: IServiceMetadata;
  base?: IServiceMetadata;
  property: string;
  index?: number;
  resource: string;
  target?: Class;
  ref?: ClassRef;
}

export interface IHandlerMetadata {
  host: IServiceMetadata;
  base?: IServiceMetadata;
  method: string;
  override?: boolean;
  source?: string;
}

export interface IServiceMetadata {
  target: Class;
  name: string;
  final: boolean;
  alias: string;
  inline: boolean;
  api: IApiMetadata;
  base: IServiceMetadata;

  dependencies: Record<string, IInjectMetadata>;
  handlers: Record<string, IHandlerMetadata>;

  initializer: IHandlerMetadata;
  selector: IHandlerMetadata;
  activator: IHandlerMetadata;
  releasor: IHandlerMetadata;

  source?: string;
}

export class InjectMetadata implements IInjectMetadata {
  public host: ServiceMetadata;
  public base: ServiceMetadata;
  public property: string;
  public index?: number;
  public resource: string;
  public target?: Class;
  public ref?: ClassRef;

  constructor(literal: IInjectMetadata) {
    Object.assign(this, literal);
  }

  public inherit(service: ServiceMetadata): InjectMetadata {
    return new InjectMetadata({ ...this, base: this.host, host: service });
  }
}

export class HandlerMetadata implements IHandlerMetadata {
  public host: ServiceMetadata;
  public base: ServiceMetadata;
  public method: string;
  public override: boolean;

  constructor(val: IHandlerMetadata) {
    Object.assign(this, val);
  }

  public inherit(service: ServiceMetadata): HandlerMetadata {
    return new HandlerMetadata({ ...this, base: this.host, host: service });
  }
}

export class ServiceMetadata implements IServiceMetadata {
  public target: Class;
  public name: string;
  public final: boolean;
  public alias: string;
  public inline: boolean;
  public api: ApiMetadata;
  public base: ServiceMetadata;

  public dependencies: Record<string, InjectMetadata> = {};
  public handlers: Record<string, HandlerMetadata> = {};
  public initializer: HandlerMetadata = undefined;
  public selector: HandlerMetadata = undefined;
  public activator: HandlerMetadata = undefined;
  public releasor: HandlerMetadata = undefined;

  constructor(target: Class) {
    this.target = target;
    this.name = target.name;
    this.alias = null;
    this.final = null;
    this.api = null;
    this.base = null;
  }

  public static has(target: Class | Prototype): boolean {
    return Reflect.hasOwnMetadata(MetadataRegistry.TYX_SERVICE, target)
      || Reflect.hasOwnMetadata(MetadataRegistry.TYX_SERVICE, target.constructor);
  }

  public static get(target: Class | Prototype): ServiceMetadata {
    return Reflect.getOwnMetadata(MetadataRegistry.TYX_SERVICE, target)
      || Reflect.getOwnMetadata(MetadataRegistry.TYX_SERVICE, target.constructor);
  }

  public static define(target: Class): ServiceMetadata {
    if (!Utils.isClass(target)) throw new TypeError('Not a class');
    let meta = this.get(target);
    if (meta) return meta;
    meta = new ServiceMetadata(target);
    Reflect.defineMetadata(MetadataRegistry.TYX_SERVICE, meta, target);
    return meta;
  }

  public inject(propertyKey: string, index: number, rsrc?: string | ClassRef | any) {
    let resource: any = undefined;
    if (!rsrc) {
      resource = Reflect.getMetadata(MetadataRegistry.DESIGN_TYPE, this.target.prototype, propertyKey);
    }
    let target: Function;
    let ref: ClassRef;
    if (Utils.isClass(rsrc)) {
      resource = rsrc.name;
      target = rsrc;
      ref = undefined;
    } else if (rsrc instanceof Function) { // TODO: Utils.isInline()
      resource = '#REF';
      target = undefined;
      ref = rsrc;
    } else if (rsrc) {
      resource = rsrc.toString();
      target = undefined;
      ref = undefined;
    } else {
      throw TypeError(`Invalid resource [${rsrc}]`);
    }
    const key = (propertyKey || '[constructor]') + (index !== undefined ? `#${index}` : '');
    this.dependencies[key] = new InjectMetadata({ host: this, property: key, resource, target, ref, index });
  }

  public addHandler(propertyKey: string, descriptor: PropertyDescriptor): this {
    if (this.handlers[propertyKey]) throw new TypeError(`Duplicate handler [${this.name}.${propertyKey}]`);
    this.handlers[propertyKey] = new HandlerMetadata({ host: this, method: propertyKey, override: false });
    return this;
  }

  public addOverride(propertyKey: string, descriptor: PropertyDescriptor): this {
    if (this.handlers[propertyKey]) throw new TypeError(`Duplicate override [${this.name}.${propertyKey}]`);
    this.handlers[propertyKey] = new HandlerMetadata({ host: this, method: propertyKey, override: true });
    return this;
  }

  public setInitializer(propertyKey: string, descriptor: PropertyDescriptor): this {
    if (this.initializer) throw new TypeError(`Duplicate initializer [${this.name}.${propertyKey}]`);
    // TODO: Check if return type is not Promise
    this.initializer = new HandlerMetadata({ host: this, method: propertyKey });
    return this;
  }

  public setSelector(propertyKey: string, descriptor: PropertyDescriptor): this {
    if (this.selector) throw new TypeError(`Duplicate selector [${this.name}.${propertyKey}]`);
    this.selector = new HandlerMetadata({ host: this, method: propertyKey });
    return this;
  }

  public setActivator(propertyKey: string, descriptor: PropertyDescriptor): this {
    if (this.activator) throw new TypeError(`Duplicate activator [${this.name}.${propertyKey}]`);
    this.activator = new HandlerMetadata({ host: this, method: propertyKey });
    return this;
  }

  public setReleasor(propertyKey: string, descriptor: PropertyDescriptor): this {
    if (this.releasor) throw new TypeError(`Duplicate releasor [${this.name}.${propertyKey}]`);
    this.releasor = new HandlerMetadata({ host: this, method: propertyKey });
    return this;
  }

  public commit(alias: string, apiClass: Class, final: boolean): this {
    // TODO: Validations
    // - Service is Api only if none is implemented
    // - Can extends non final base service

    this.final = !!final;

    const parent = Utils.baseClass(this.target);
    const base = ServiceMetadata.get(parent);
    if (base && base.final) throw new TypeError('Base service is final');
    if (!base && ApiMetadata.has(parent)) throw new TypeError('Extends Api class');

    let api = apiClass && ApiMetadata.get(apiClass);
    if (apiClass && !api) throw new TypeError('Not a Api class');
    api = api || base && !base.inline && base.api;
    this.api = api || null;
    if (api && base && !base.inline && base.api && api !== base.api) throw new TypeError('Base Api override');

    this.alias = api && api.alias
      || alias
      || base && base.alias
      || !!final && this.target.name // .replace(/Service$/, '')
      || null;

    const sap = ApiMetadata.get(this.target);
    if (api && sap) throw new TypeError('Service implements and defines own Api');
    this.api = api || sap;
    // if (!this.api) this.api = sap = ApiMetadata.define(this.target);
    this.inline = !!sap || !api;
    if (sap) sap.commit();
    if (api) api.addService(this);

    this.inherit(base);

    const prev = Registry.ServiceMetadata[this.name];
    // TODO: Store by name, separate unique by alias
    if (prev && prev !== this) throw new TypeError(`Duplicate service name [${this.name}]`);
    Registry.ServiceMetadata[this.name] = this;

    if (this.api) {
      for (const method in this.api.methods) {
        const meta = this.api.methods[method];
        const handler = this.handlers[method];
        if (!handler && this.api.owner !== this) {
          throw new TypeError(`Service [${this.name}] missing handler for [${this.api.name}.${method}]`);
        }
        const own = Object.getOwnPropertyDescriptor(this.target.prototype, method);
        if (own && this.base && (!this.api.owner || meta.base) && (!handler || handler.base || !handler.override)) {
          throw new TypeError(`Service [${this.name}] missing override handler for [${this.base.name}.${method}]`);
        }
      }
      for (const method in this.handlers) {
        if (this.api && !this.api.methods[method]) {
          throw new TypeError(`Service [${this.name}] lose handler on [${method}]`);
        }
        const descriptor = Object.getOwnPropertyDescriptor(this.target.prototype, method);
        if (descriptor) {
          descriptor.writable = false;
        }
      }
      this.api.publish(this);
    }

    return this;
  }

  private inherit(base: ServiceMetadata): this {
    if (!base) return this;

    this.base = base || null;
    this.initializer = this.initializer || base.initializer && base.initializer.inherit(this);
    this.selector = this.selector || base.selector && base.selector.inherit(this);
    this.activator = this.activator || base.activator && base.activator.inherit(this);
    this.releasor = this.releasor || base.releasor && base.releasor.inherit(this);

    for (const dep of Object.entries(base.dependencies)) {
      if (this.dependencies[dep[0]]) continue;
      this.dependencies[dep[0]] = dep[1].inherit(this);
    }

    for (const han of Object.entries(base.handlers)) {
      if (this.handlers[han[0]]) continue;
      this.handlers[han[0]] = han[1].inherit(this);
    }
    return this;
  }
}
