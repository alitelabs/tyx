import { ApiMetadata } from '../metadata/api';
import { Metadata } from '../metadata/registry';

// tslint:disable-next-line:function-name
export function Api(alias?: string): ClassDecorator {
  return Metadata.onClass(Api, { alias }, (target) => {
    ApiMetadata.define(target).commit(alias);
  });
}
