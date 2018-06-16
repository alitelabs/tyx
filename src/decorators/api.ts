import { ApiMetadata } from '../metadata/api';
import { Registry } from '../metadata/registry';

// tslint:disable-next-line:function-name
export function Api(name?: string): ClassDecorator {
  return (target) => {
    Registry.trace(Api, { name }, target);
    ApiMetadata.define(target).commit(name);
  };
}
