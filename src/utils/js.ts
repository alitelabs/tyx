const CLASS = Symbol('isClass');

// https://github.com/nof1000/isclass/blob/master/index.js
export function isClass(cls: any): cls is Function {
  if (typeof (cls) === 'function' && cls.prototype) {
    if (cls[CLASS]) return true;
    try {
      return !(cls.arguments && cls.caller);
    } catch (e) {
      Object.defineProperty(cls, CLASS, { value: true, writable: false, enumerable: false, configurable: false });
      return true;
    }
  }
  return false;
}

// http://stackoverflow.com/questions/1007981/how-to-get-function-parameter-names-values-dynamically-from-javascript
export function getArgs(func: (...args: any[]) => any): string[] {
  return (func + '')
    .replace(/[/][/].*$/mg, '') // strip single-line comments
    .replace(/\s+/g, '') // strip white space
    .replace(/[/][*][^/*]*[*][/]/g, '') // strip multi-line comments
    .split('){', 1)[0].replace(/^[^(]*[(]/, '') // extract the parameters
    .replace(/=[^,]+/g, '') // strip any ES6 defaults
    .split(',').filter(Boolean); // split & filter [""]
}

export function label(val: any) {
  if (val instanceof Function) {
    if (isClass(val)) return `[class: ${val.name || 'inline'}]`;
    if (val.name) return `[function: ${val.name}]`;
    // TODO: is arrow function
    return `[ref: ${val.toString()}]`;
  }
  if (typeof val === 'object' && val && val.constructor) {
    return `[object: ${val.constructor.name}]`;
  }
  return val;
}

export function baseClass(cls: Function): Function {
  const p = cls && Object.getPrototypeOf(cls.prototype);
  return p && p.constructor;
}
