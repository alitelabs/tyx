import { Metadata } from "./common";

/**
 * Decorator for annotating exceptions which can be serialized
 */
export function Exception(target: Function) {
    Metadata.trace(Exception, target);
    Exception.ctors[target.name] = target;
}

export namespace Exception {
    export const ctors = {};
}