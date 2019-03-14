import { ApiMetadata } from '../metadata/api';
import { Metadata } from '../metadata/registry';

// tslint:disable-next-line:function-name
export function Api(alias?: string): ClassDecorator {
  return (target) => {
    return Metadata.trace(Api, {}, target, void 0, void 0, () => {
      ApiMetadata.define(target).commit(alias);
    });
  };
}
