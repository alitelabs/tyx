import { Di } from '../import';
import { Metadata } from '../metadata/registry';
import { ServiceMetadata } from '../metadata/service';
import { Class, ClassRef } from '../types/core';
import { Utils } from '../utils';

// tslint:disable:function-name

// TODO (name?: string, ...apis: Function[])
// TODO: Selector

export function CoreService(): ClassDecorator;
export function CoreService(alias: string): ClassDecorator;
export function CoreService(aliasApiFinal?: string): ClassDecorator {
  if (aliasApiFinal) {
    return Service.call(null, aliasApiFinal, false);
  }
  return Service.call(null, false);
}
CoreService.core = true;

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
  return Metadata.onClass(Service, { aliasApiFinal, finalOrNot }, (target) => {
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
    const meta = ServiceMetadata.define(target).commit(alias, api, final);
    return final ? Di.Service(meta.alias)(target) : undefined;
  });
}

/**
 * Injects a service into a class property or constructor parameter.
 */
export function Inject(type?: ClassRef): Function;
/**
 * Injects a service into a class property or constructor parameter.
 */
export function Inject(serviceName?: string): PropertyDecorator | ParameterDecorator | any;
export function Inject(resource?: ClassRef | string): PropertyDecorator | ParameterDecorator | any {
  return Metadata.onParameter(Inject, { resource }, (target, propertyKey, index) => {
    const constructor = Utils.isClass(target) ? target as Function : target.constructor;
    ServiceMetadata.define(constructor).inject(propertyKey as string, index, resource);
    return Di.Inject(resource as any)(target, propertyKey, index);
  });
}

/**
 * Decorate method providing service initialization.
 */
export function Initialize(): MethodDecorator {
  return Metadata.onMethod(Handler, {}, (target, propertyKey, descriptor) => {
    ServiceMetadata.define(target.constructor).setInitializer(propertyKey as string, descriptor);
  });
}

// /**
//  * Decorate method providing per request activation.
//  */
// export function Selector(): MethodDecorator {
//   return Metadata.onMethod(Handler, {}, (target, propertyKey, descriptor) => {
//     ServiceMetadata.define(target.constructor).setSelector(propertyKey as string, descriptor);
//   });
// }

/**
 * Decorate method providing per request activation.
 */
export function Activate(): MethodDecorator {
  return Metadata.onMethod(Handler, {}, (target, propertyKey, descriptor) => {
    ServiceMetadata.define(target.constructor).setActivator(propertyKey as string, descriptor);
  });
}

/**
 * Decorate method providing per request release.
 */
export function Release(): MethodDecorator {
  return Metadata.onMethod(Handler, {}, (target, propertyKey, descriptor) => {
    ServiceMetadata.define(target.constructor).setReleasor(propertyKey as string, descriptor);
  });
}

// TODO: (api: Function, method?: string)
/**
 * Decorate methods providing Api implementation.
 */
export function Handler(): MethodDecorator {
  return Metadata.onMethod(Handler, {}, (target, propertyKey, descriptor) => {
    ServiceMetadata.define(target.constructor).addHandler(propertyKey as string, descriptor);
  });
}

/**
 * Decorate methods providing Api implementation.
 */
export function Override(): MethodDecorator {
  return Metadata.onMethod(Handler, {}, (target, propertyKey, descriptor) => {
    ServiceMetadata.define(target.constructor).addOverride(propertyKey as string, descriptor);
  });
}
