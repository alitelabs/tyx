export type ThriftJson = {
  N?: number;
  S?: string;
  B?: boolean;
  L?: ThriftJson[];
  M?: Map<string, ThriftJson>;
};

export function isTson(val: any) {
  const keys = val && Object.keys(val);
  return keys && (keys.length === 0 || keys.length === 1 && ['N', 'B', 'S', 'M', 'L'].includes(keys[0]));
}
isTson.code = function () {
  return isTson.toString().replace('(val)', '(val: any)');
};

export function marshal(val: any): ThriftJson {
  if (val === null || val === undefined) return val;
  if (typeof val === 'function') return undefined;
  if (typeof val === 'number') return { N: val };
  if (typeof val === 'boolean') return { B: val };
  if (typeof val === 'string') return { S: val };
  if (Array.isArray(val)) return { L: val.map(i => marshal(i)) };
  const map = new Map();
  Object.entries(val).forEach(i => map.set(i[0], marshal(i[0])));
  return { M: map };
}
marshal.code = function (): string {
  return marshal
    .toString()
    .replace('(val)', '(val: any): any')
    .replace('\n    return', ' return');
};

export function unmarshal(json: ThriftJson): any {
  if (!isTson(json)) return json;
  if ('N' in json) return json.N;
  if ('S' in json) return json.S;
  if ('B' in json) return json.B;
  if ('L' in json) return json.L.map(i => unmarshal(i));
  if (!('M' in json)) return json;
  const obj: any = {};
  json.M.forEach((v, k) => obj[k] = unmarshal(v));
  return obj;
}
unmarshal.code = function (pkg?: string) {
  return unmarshal
    .toString()
    .replace('(json)', `(json: ${pkg || ''}IJson): any`)
    .replace('const obj =', 'const obj: any =')
    .replace('\n    return', ' return');
};
