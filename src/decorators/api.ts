import { ApiMetadata } from '../metadata/api';
import { Metadata } from '../metadata/registry';

// tslint:disable-next-line:function-name
export function Api(): ClassDecorator {
  return (target) => {
    Metadata.trace(Api, {}, target);
    ApiMetadata.define(target).commit();
  };
}
