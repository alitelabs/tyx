import { Di } from '../import';
import { ProxyMetadata } from '../metadata/proxy';
import { Metadata } from '../metadata/registry';

// tslint:disable-next-line:function-name
export function Proxy(service?: string, application?: string, functionName?: string): ClassDecorator {
  return Metadata.onClass(Proxy, { service, application, functionName }, (target) => {
    const meta = ProxyMetadata.define(target).submit(service, application, functionName);
    return Di.Service(meta.target)(target);
  });
}
