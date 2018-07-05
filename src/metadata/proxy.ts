import { Class, Prototype } from '../types/core';
import { Metadata } from './registry';
import { IServiceMetadata, ServiceMetadata } from './service';

export interface IProxyMetadata extends IServiceMetadata {
  application: string;
  functionName: string;
}

export class ProxyMetadata extends ServiceMetadata implements IProxyMetadata {
  public functionName: string = undefined;
  public application: string = undefined;

  protected constructor(target: Class) {
    super(target);
  }

  public static has(target: Class | Prototype): boolean {
    return Reflect.hasMetadata(Metadata.TYX_PROXY, target)
      || Reflect.hasMetadata(Metadata.TYX_PROXY, target.constructor);
  }

  public static get(target: Class | Prototype): ProxyMetadata {
    return Reflect.getMetadata(Metadata.TYX_PROXY, target)
      || Reflect.getMetadata(Metadata.TYX_PROXY, target.constructor);
  }

  public static define(target: Class): ProxyMetadata {
    let meta = this.get(target);
    if (!meta) {
      meta = ServiceMetadata.define(target) as any;
      Object.setPrototypeOf(meta, ProxyMetadata.prototype);
      Reflect.defineMetadata(Metadata.TYX_PROXY, meta, target);
    }
    return meta;
  }

  public commit(service?: string, application?: string, functionName?: string): this {
    this.alias = service; // || this.target.name.replace('Proxy', '');
    this.functionName = functionName || (this.alias + '-function');
    this.application = application;
    super.commit(service);
    return this;
  }
}
