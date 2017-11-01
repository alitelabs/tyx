
/**
 * Decorator for annotating exceptions which can be serialized
 *
 * @export
 * @template T any Class which extends Error
 * @param {T} inputClass
 */
export function Exception(type: Function) {
    Exception.ctors[type.name] = type;
}

export namespace Exception {
    export const ctors = {};
}