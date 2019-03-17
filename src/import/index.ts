import * as Di from './typedi';
import { TypeOrm } from './typeorm';

// tslint:disable-next-line:variable-name
export const Imports = [
  Di,
  TypeOrm
];

export { Di, TypeOrm };
