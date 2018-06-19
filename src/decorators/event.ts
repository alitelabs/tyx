import { MethodMetadata } from '../metadata/method';
import { Metadata } from '../metadata/registry';
import { EventAdapter } from '../types/event';

// tslint:disable-next-line:function-name
export function Event(
  source: string,
  resource: string,
  actionFilter: string | boolean,
  objectFilter: string,
  adapter: EventAdapter,
): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    Metadata.trace(Event, { source, resource, actionFilter, objectFilter, adapter }, target, propertyKey);
    if (typeof propertyKey !== 'string') throw new TypeError('propertyKey must be string');
    MethodMetadata.define(target, propertyKey, descriptor).addEvent(source, resource, actionFilter, objectFilter, adapter);
  };
}
