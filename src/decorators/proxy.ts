import { ProxyMetadata } from '../metadata/proxy';
import { Registry } from '../metadata/registry';

// tslint:disable-next-line:function-name
export function Proxy(service?: string, application?: string, functionName?: string): ClassDecorator {
  return (target) => {
    Registry.trace(Proxy, { service, application, functionName }, target);
    ProxyMetadata.define(target).commit(service, application, functionName);
  };
}
