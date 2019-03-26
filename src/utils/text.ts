/**
 * Converts string into camelCase.
 *
 * @see http://stackoverflow.com/questions/2970525/converting-any-string-into-camel-case
 */
export function camelCase(str: string, firstCapital: boolean = false): string {
  return str.replace(/^([A-Z])|[\s-_](\w)/g, (match, p1, p2, offset) => {
    if (firstCapital && offset === 0) return p1;
    if (p2) return p2.toUpperCase();
    return p1.toLowerCase();
  });
}

/**
 * Converts string into snake_case.
 *
 * @see https://regex101.com/r/QeSm2I/1
 */
export function snakeCase(str: string, upper?: boolean) {
  const val = str.replace(/(?:([a-z])([A-Z]))|(?:((?!^)[A-Z])([a-z]))/g, '$1_$3$2$4');
  return upper ? val.toUpperCase() : val.toLowerCase();
}

/**
 * Converts string into kebab-case.
 *
 * @see https://regex101.com/r/mrU9L0/1
 */
export function kebapCase(str: string, upper?: boolean) {
  const val = str.replace(/(?:([a-z])([A-Z]))|(?:((?!^)[A-Z])([a-z]))/g, '$1-$3$2$4');
  return upper ? val.toUpperCase() : val.toLowerCase();
}

/**
 * Converts string into title-case.
 *
 * @see http://stackoverflow.com/questions/196972/convert-string-to-title-case-with-javascript
 */
export function titleCase(str: string): string {
  return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

export function indent(text: string, spaces?: string | number) {
  // tslint:disable-next-line:no-parameter-reassignment
  if (typeof spaces === 'number') spaces = ' '.repeat(spaces);
  const lines = text.split('\n');
  let first = lines[0];
  if (!first.trim().length) first = lines[1] || '';
  const pad = first.substr(0, first.indexOf(first.trim()));
  const res = lines.map(line => line.startsWith(pad) ? line.substring(pad.length) : line)
    .map(line => ((spaces || '') + line).trimRight())
    .join('\n');
  return res;
}
