import { Metadata } from "../metadata/core";
import { Class } from "../types";

/**
 * Decorator for annotating exceptions which can be serialized
 */
export function Exception(target: Class) {
    Metadata.trace(Exception, undefined, target);
    Exception.ctors[target.name] = target;
}

export namespace Exception {
    export const ctors = {};
}