export function scalar(obj: any): string {
  let res = '{';
  let i = 0;
  for (const [key, val] of Object.entries(obj)) res += `${(i++) ? ', ' : ' '}${key}: ${JSON.stringify(val)}`;
  res += ' }';
  return res;
}

export function back(text: string) {
  const lines = text.split('\n');
  let first = lines[0];
  if (!first.trim().length) first = lines[1];
  const pad = first.substr(0, first.indexOf(first.trim()));
  const res = lines.map(line => line.startsWith(pad) ? line.substring(pad.length) : line)
    .map(line => line.trimRight())
    .join('\n');
  return res;
}

// function ww(path) {
//     return (path.prev ? ww(path.prev) : "") + "/" + path.key;
// }
