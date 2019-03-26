import { MethodMetadata } from '../metadata/method';
import { CoreDecorator } from '../metadata/registry';

// tslint:disable-next-line:function-name
export function Event(
  source: string,
  resource: string,
  actionFilter: string | boolean,
  objectFilter: string
): MethodDecorator {
  return CoreDecorator.onMethod(Event, { source, resource, actionFilter, objectFilter }, (target, propertyKey, descriptor) => {
    MethodMetadata.define(target, propertyKey as string, descriptor).addEvent(source, resource, actionFilter, objectFilter);
  });
}
