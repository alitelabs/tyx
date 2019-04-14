import { Utils } from "exer";

const TSON = Symbol('tson');
const ATOMIC = ['u', 'n', 'b', 's', 't', 'r'];

export type Tson = {
  u?: boolean;
  n?: number;
  b?: boolean;
  s?: string;
  t?: number;
  r?: string;
  l?: Tson[];
  m?: Map<string, Tson>;
  [TSON]?: boolean;
};

export namespace Tson {
  function tson(tson: Tson): Tson {
    if (tson[TSON]) return tson;
    Object.defineProperty(tson, TSON, { value: true, enumerable: false, configurable: false, writable: false });
    return tson;
  }
  tson.code = function () {
    return tson.toString().replace('(tson)', '(tson: any)');
  };

  export function isTson(val: any) {
    if (val === null || val === undefined) return false;
    if (val[TSON]) return true;
    const keys = Object.keys(val);
    if (keys.length > 1) return false;
    if (ATOMIC.includes(keys[0])) return true;
    let res = false;
    if (keys[0] === 'l') {
      res = true;
      const list: any[] = val.l;
      for (const item of list) {
        if (!isTson(item)) return false;
      }
    }
    if (keys[0] === 'm') {
      res = true;
      const map: any = (val.m instanceof Map) ? val.m : Object.entries(val.m);
      for (const item of map) {
        if (!isTson(item)) return false;
      }
    }
    return res;
  }
  isTson.code = function () {
    return isTson.toString().replace('(val)', '(val: any)');
  };

  export function marshal(val: any): Tson {
    if (isTson(val)) return val;
    if (val === undefined) return tson({ u: false });
    if (val === null) return tson({ u: true });
    if (typeof val === 'function') return tson({ u: false });
    if (typeof val === 'number') return tson({ n: val });
    if (typeof val === 'boolean') return tson({ b: val });
    if (typeof val === 'string') return tson({ s: val });
    if (val instanceof Date) return tson({ t: val.getTime() });
    if (val instanceof Buffer) return tson({ r: val.toString('base64') });
    if (Array.isArray(val)) return tson({ l: val.map(i => marshal(i)) });
    const map: any = new Map();
    Object.entries(val).forEach(i => map.set(i[0], marshal(i[1])));
    return tson({ m: map });
  }
  marshal.code = function (pkg?: string): string {
    return marshal
      .toString()
      .replace('(val)', '(val: any): any');
  };

  export function unmarshal(val: Tson, ready?: boolean): any {
    // if (!isTson(val)) return val;
    if (val === undefined || val === null || typeof val !== 'object') return val;
    if (val instanceof Date || val instanceof Buffer) return val;
    const keys = Object.keys(val);
    if (keys.length > 1) return val;
    if (keys[0] === 'u') return val.u ? null : undefined;
    if (keys[0] === 'n') return val.n;
    if (keys[0] === 'b') return val.b;
    if (keys[0] === 's') return val.s;
    if (keys[0] === 't') return new Date(val.t);
    if (keys[0] === 'r') return Buffer.from(val.r, 'base64');
    if (keys[0] === 'l') return ready ? val.l : val.l.map(i => unmarshal(i));
    if (!(keys[0] === 'm')) return val;
    const obj: any = {};
    val.m.forEach((v, k) => obj[k] = ready ? v : unmarshal(v));
    return obj;
  }
  unmarshal.code = function (pkg?: string) {
    return unmarshal
      .toString()
      .replace('(val, ready)', `(val: ${pkg ? pkg + '.' : ''}ITson, ready?: boolean): any`)
      .replace('const obj =', 'const obj: any =');
  };

  export function code(pkg?: string) {
    const code = Utils.indent(`
    const TSON = Symbol('tson');
    const ATOMIC = [${ATOMIC.map(i => `'${i}'`).join(', ')}];
    ${tson.code()}
    ${isTson.code()}
    ${marshal.code(pkg)}
    ${unmarshal.code(pkg)}
    `);
    return code.replace(/\)\n\s+return/g, ') return').replace(/    /g, '  ');
  }
}
