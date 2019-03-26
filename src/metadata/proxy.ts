import { Class, Prototype } from '../types/core';
import { Utils } from '../utils';
import { MetadataRegistry } from './registry';
import { IServiceMetadata, ServiceMetadata } from './service';

export interface IProxyMetadata extends IServiceMetadata {
  application: string;
  functionName: string;
}

export class ProxyMetadata extends ServiceMetadata implements IProxyMetadata {
  public functionName: string = undefined;
  public application: string = undefined;

  private constructor(target: Class) {
    super(target);
  }

  public static has(target: Class | Prototype): boolean {
    return Reflect.hasOwnMetadata(MetadataRegistry.TYX_PROXY, target)
      || Reflect.hasOwnMetadata(MetadataRegistry.TYX_PROXY, target.constructor);
  }

  public static get(target: Class | Prototype): ProxyMetadata {
    return Reflect.getOwnMetadata(MetadataRegistry.TYX_PROXY, target)
      || Reflect.getOwnMetadata(MetadataRegistry.TYX_PROXY, target.constructor);
  }

  public static define(target: Class): ProxyMetadata {
    if (!Utils.isClass(target)) throw new TypeError('Not a class');
    let meta = this.get(target);
    if (meta) return meta;
    const base = Utils.baseClass(target);
    if (base && ServiceMetadata.has(base)) throw new TypeError('Inheritance not supported');
    meta = ServiceMetadata.define(target) as any;
    Object.setPrototypeOf(meta, ProxyMetadata.prototype);
    Reflect.defineMetadata(MetadataRegistry.TYX_PROXY, meta, target);
    return meta;
  }

  public submit(service?: string, application?: string, functionName?: string): this {
    this.alias = service; // || this.target.name.replace('Proxy', '');
    this.functionName = functionName || (this.alias + '-function');
    this.application = application;
    super.commit(service, null, true);
    return this;
  }
}
