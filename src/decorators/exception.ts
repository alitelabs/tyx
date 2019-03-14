import { Metadata } from '../metadata/registry';

// tslint:disable:function-name

/**
 * Decorator for annotating exceptions which can be serialized
 */
export function Exception(target: new () => any) {
  return Metadata.trace(Exception, undefined, target, void 0, void 0, () => {
    Exception.ctors[target.name] = target;
  });
}
Exception.core = true;

export namespace Exception {
  export const ctors: Record<string, new () => any> = {};
}
