import * as Aws from './aws';
import * as Express from './express';
import * as Di from './typedi';
import * as Orm from './typeorm';

// tslint:disable-next-line:variable-name
export const Imports = [
  Di,
  Orm,
  Aws,
  Express
];

export { Di, Orm, Aws, Express };
