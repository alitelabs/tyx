import { Di } from '../import';
import { ApiMetadata } from '../metadata/api';
import { CoreDecorator } from '../metadata/registry';

// tslint:disable-next-line:function-name
export function Api(alias?: string): ClassDecorator {
  return CoreDecorator.onClass(Api, { alias }, (target) => {
    const meta = ApiMetadata.define(target).commit(alias);
    return !meta.owner ? Di.Service()(target) : undefined;
  });
}
