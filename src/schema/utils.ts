import { Utils } from 'exer';

export namespace SchemaUtils {
  export function label(val: any) {
    if (val instanceof Function) {
      if (Utils.isClass(val)) return `[class: ${val.name || 'inline'}]`;
      if (val.name) return `[function: ${val.name}]`;
      // TODO: is arrow function
      return `[ref: ${val.toString()}]`;
    }
    if (typeof val === 'object' && val && val.constructor) {
      return `[object: ${val.constructor.name}]`;
    }
    return val;
  }
  export function filter(rec: Record<string, any> | any[], query: any) {
    let data = rec;
    if (!Array.isArray(data)) data = rec && Object.values(rec);
    if (query.eq && data) data = Utils.filter(data, query.eq);
    // TODO: Implement like
    return data;
  }
}
