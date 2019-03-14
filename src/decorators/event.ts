import { MethodMetadata } from '../metadata/method';
import { Metadata } from '../metadata/registry';

// tslint:disable-next-line:function-name
export function Event(
  source: string,
  resource: string,
  actionFilter: string | boolean,
  objectFilter: string
): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    return Metadata.trace(Event, { source, resource, actionFilter, objectFilter }, target, propertyKey, void 0, () => {
      if (typeof propertyKey !== 'string') throw new TypeError('propertyKey must be string');
      MethodMetadata.define(target, propertyKey, descriptor).addEvent(source, resource, actionFilter, objectFilter);
    });
  };
}
