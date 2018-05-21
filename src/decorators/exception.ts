
/**
 * Decorator for annotating exceptions which can be serialized
 *
 * @export
 * @template T any Class which extends Error
 * @param {T} inputClass
 */
export function Exception(target: Function) {
    Exception.ctors[target.name] = target;
}

export namespace Exception {
    export const ctors = {};
}