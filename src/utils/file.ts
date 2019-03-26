import fs = require('fs');

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

export function readFile(path: string) {
  return fs.readFileSync(path).toString('utf-8');
}

export function readJson(path: string) {
  return JSON.parse(readFile(path));
}

export function writeFile(path: string, content: string | Buffer) {
  fs.writeFileSync(path, content);
  return fs.statSync(path);
}

export function appendFile(path: string, content: string | Buffer) {
  fs.appendFileSync(path, content);
  return fs.statSync(path);
}
