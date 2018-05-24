/**
 * Decorator for annotating exceptions which can be serialized
 */
export function Exception(target: Function) {
    Exception.ctors[target.name] = target;
}

export namespace Exception {
    export const ctors = {};
}