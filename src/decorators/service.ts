import { Di } from '../import';
import { Metadata } from '../metadata/registry';
import { ServiceMetadata } from '../metadata/service';
import { Class } from '../types/core';
import { Utils } from '../utils';

// tslint:disable:function-name

// TODO (name?: string, ...apis: Function[])
// TODO: Selector

// Simple final service and api
export function Service(): ClassDecorator;
// Named simple service
export function Service(alias: string, final?: false): ClassDecorator;
// Implements API
export function Service(api: Class, final?: false): ClassDecorator;
// export function Service(api: ((api: any) => Class), final?: false): ClassDecorator;
// Abstract unnamed service, to be extended
export function Service(final: false): ClassDecorator;
// Replacement service, must inherit from final:fasle service
export function Service(final: true): ClassDecorator;
export function Service(aliasApiFinal?: Class | string | false | true, finalOrNot?: true | false): ClassDecorator {
  return (target) => {
    let alias: string = null;
    let api: Class = null;
    let final: boolean;
    if (aliasApiFinal === undefined && finalOrNot === undefined) {
      alias = target.name;
      final = true;
    } else if (aliasApiFinal === false) {
      final = false;
    } else if (aliasApiFinal === true) {
      final = true;
    } else if (typeof aliasApiFinal === 'string') {
      alias = aliasApiFinal;
      final = finalOrNot === undefined || !!finalOrNot;
    } else {
      const apiClass = aliasApiFinal; //  aliasApiFinal(void 0);
      if (!Utils.isClass(apiClass)) throw new TypeError('Class expected');
      api = apiClass;
      final = finalOrNot === undefined || !!finalOrNot;
    }

    Metadata.trace(Service, { alias, api, final }, target);
    const meta = ServiceMetadata.define(target).commit(alias, api, final);
    return final ? Di.Service(meta.alias)(target) : undefined;
  };
}

export function Inject(resource?: string): PropertyDecorator & ParameterDecorator {
  return (target: Object, propertyKey: string | symbol, index?: number) => {
    if (typeof propertyKey === 'symbol') throw new TypeError('propertyKey must be string');
    // propertyKey = propertyKey || "<constructor>";
    Metadata.trace(Inject, { resource }, target, propertyKey, index);
    const constructor = Utils.isClass(target) ? target as Function : target.constructor;
    ServiceMetadata.define(constructor).inject(propertyKey, index, resource);
    return Di.Inject(resource)(target, propertyKey, index);
  };
}

/**
 * Decorate method providing service initialization.
 */
export function Initialize(): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    Metadata.trace(Handler, {}, target);
    if (typeof propertyKey !== 'string') throw new TypeError('propertyKey must be string');
    ServiceMetadata.define(target.constructor).setInitializer(propertyKey, descriptor);
  };
}

/**
 * Decorate method providing per request activation.
 */
export function Selector(): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    Metadata.trace(Selector, {}, target);
    if (typeof propertyKey !== 'string') throw new TypeError('propertyKey must be string');
    ServiceMetadata.define(target.constructor).setSelector(propertyKey, descriptor);
  };
}

/**
 * Decorate method providing per request activation.
 */
export function Activate(): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    Metadata.trace(Activate, {}, target);
    if (typeof propertyKey !== 'string') throw new TypeError('propertyKey must be string');
    ServiceMetadata.define(target.constructor).setActivator(propertyKey, descriptor);
  };
}

/**
 * Decorate method providing per request release.
 */
export function Release(): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    Metadata.trace(Release, {}, target);
    if (typeof propertyKey !== 'string') throw new TypeError('propertyKey must be string');
    ServiceMetadata.define(target.constructor).setReleasor(propertyKey, descriptor);
  };
}

// TODO: (api: Function, method?: string)
/**
 * Decorate methods providing Api implementation.
 */
export function Handler(): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    Metadata.trace(Handler, {}, target);
    if (typeof propertyKey !== 'string') throw new TypeError('propertyKey must be string');
    ServiceMetadata.define(target.constructor).addHandler(propertyKey, descriptor);
  };
}
