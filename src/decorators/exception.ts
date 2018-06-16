import { Registry } from '../metadata/registry';

// tslint:disable:function-name

/**
 * Decorator for annotating exceptions which can be serialized
 */
export function Exception(target: new () => any) {
  Registry.trace(Exception, undefined, target);
  Exception.ctors[target.name] = target;
}

export namespace Exception {
  export const ctors: Record<string, new () => any> = {};
}
