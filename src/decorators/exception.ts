import { Registry } from "../metadata/registry";
import { Class } from "../types/core";

/**
 * Decorator for annotating exceptions which can be serialized
 */
export function Exception(target: Class) {
    Registry.trace(Exception, undefined, target);
    Exception.ctors[target.name] = target;
}

export namespace Exception {
    export const ctors = {};
}