export type IJson = {
  N?: number;
  S?: string;
  B?: boolean;
  L?: IJson[];
  M?: Map<string, IJson>;
};

export function marshal(val: any): IJson {
  if (val === null || val === undefined) return val;
  if (typeof val === 'function') return undefined;
  if (typeof val === 'number') return { N: val };
  if (typeof val === 'boolean') return { B: val };
  if (typeof val === 'string') return { S: val };
  if (Array.isArray(val)) {
    const list: IJson[] = [];
    val.forEach(item => list.push(marshal(item)));
    return { L: list };
  }
  const map = new Map<string, IJson>();
  for (const key in val) {
    const res = marshal(val[key]);
    if (res === undefined) continue;
    map.set(key, res);
  }
  return { M: map };
}

export function unmarshal(val: IJson): any {
  // TODO: Implement
  return val;
}
