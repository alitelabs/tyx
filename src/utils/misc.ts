// tslint:disable-next-line:import-name
import uuidr = require('uuid/v4');
import fs = require('fs');
import os = require('os');

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

export function uuid() {
  return uuidr();
}

export function password() {
  let u = uuid() + uuid();
  u = u.split('-').join('');
  let b = new Buffer(u, 'hex').toString('base64');
  b = b.split('+').join('').split('/').join('');
  const p = b.substr(0, 4) + '-' + b.substr(4, 4) + '-' + b.substr(8, 4) + '-' + b.substr(12, 4);
  return p;
}

// https://github.com/nof1000/isclass/blob/master/index.js
export function isClass(cls: any): cls is Function {
  if (typeof (cls) === 'function' && cls.prototype) {
    try {
      return !(cls.arguments && cls.caller);
    } catch (e) {
      return true;
    }
  }
  return false;
}

export function baseClass(cls: Function): Function {
  const p = cls && Object.getPrototypeOf(cls.prototype);
  return p && p.constructor;
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

const notBase64 = /[^A-Z0-9+\/=\n\r]/i;

export function isUUID(str: string): boolean {
  if (!str) return false;
  return !!str.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
}

// const base64 = new RegExp("^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})([=]{1,2})?$");

export function isBase64(str: string): boolean {
  let len = str.length;
  const firstPaddingIndex = str.indexOf('=');
  let firstPaddingChar = firstPaddingIndex;
  let firstCorrect = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (c === '\r' || c === '\n') {
      len--;
      if (i < firstPaddingChar) firstCorrect++;
    }
  }
  if (firstPaddingChar > firstCorrect) firstPaddingChar -= firstCorrect;
  if (!len || len % 4 !== 0 || notBase64.test(str)) {
    return false;
  }
  return firstPaddingChar === -1 ||
    firstPaddingChar === len - 1 ||
    (firstPaddingChar === len - 2 && str[firstPaddingIndex + 1] === '=');
}

const gzipPrefix = Buffer.from('1F8B', 'hex');

export function isGzip(buf: Buffer | string): boolean {
  // 1f 8b;
  if (typeof buf === 'string') {
    return buf.startsWith(gzipPrefix.toString());
  }
  if (typeof buf === 'object' && buf instanceof Buffer) {
    return (buf[0] === gzipPrefix[0] && buf[1] === gzipPrefix[1]);
  }
  return false;
}

export function wildcardMatch(rule: string, value: string) {
  return new RegExp('^' + rule.split('*').join('.*') + '$').test(value);
}

export function parseMap(map: string, prefix?: string) {
  const res: Record<string, any> = {};
  const parts = map.split(';').map(x => x.trim()).filter(x => x);
  for (const part of parts) {
    let key: string;
    let value: string;
    [key, value] = part.split('=').map(x => x.trim()).filter(x => x);
    res[(prefix || '') + key] = value;
  }
  return res;
}

export function scalar(obj: any): string {
  let res = '{';
  let i = 0;
  for (const [key, val] of Object.entries(obj)) res += `${(i++) ? ', ' : ' '}${key}: ${JSON.stringify(val)}`;
  res += ' }';
  return res;
}

export function relative(path: string, root: string, rem?: string, wit?: string): string {
  let i = 0;
  while (path[i] === root[i] && i < path.length) i++;
  return path.substring(i).replace(rem || '', wit || '');
}

export function fsize(path: string) {
  try {
    return fs.statSync(path).size;
  } catch (err) {
    return undefined;
  }
}

export function mem() {
  const usg = process.memoryUsage();
  return `rss: ${mb(usg.rss)}, heap: ${mb(usg.heapUsed)}`;
}

export function mb(size: number) {
  const kb = size / 1024;
  if (kb < 1025) return kb.toFixed(0) + ' KB';
  return (kb / 1024).toFixed(3) + ' MB';
}

export function writeFile(path: string, content: string | Buffer) {
  fs.writeFileSync(path, content);
  return fs.statSync(path);
}

export function interfaces() {
  const ifaces = os.networkInterfaces();
  const result: string[] = [];
  Object.keys(ifaces).forEach((ifname) => {
    let alias = 0;
    ifaces[ifname].forEach((iface) => {
      if ('IPv4' !== iface.family || iface.internal) {
        // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
        return;
      }
      if (alias >= 1) {
        // this single interface has multiple ipv4 addresses
        result.push(`${alias}@${ifname}: ${iface.address}`);
      } else {
        // this interface has only one ipv4 adress
        result.push(`${ifname}: ${iface.address}`);
      }
      ++alias;
    });
  });
  return result;
}

// export function reload(level?: number): NodeModule {
//   const dump = modules(level);
//   const list = Object.keys(require.cache);
//   console.log('Before relaod:', list.length);
//   // const now = Object.keys(require.cache);
//   for (const key of list) {
//     delete require.cache[key];
//   }
//   let first: NodeModule = undefined;
//   for (const mod of dump.files) {
//     if (require.cache[mod.id]) continue;
//     console.log('Reload:', mod.id);
//     first = first || require(mod.id);
//   }
//   console.log('After relaod:', Object.keys(require.cache).length);
//   return first;
// }
