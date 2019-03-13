import * as Di from './typedi';
import * as Orm from './typeorm';

// tslint:disable-next-line:variable-name
export const Imports = [
  Di,
  Orm
];

export { Di, Orm, Express };
