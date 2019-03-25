import 'reflect-metadata';
import misc = require('./misc');
import thrift = require('./thrift');
import text = require('./text');
import time = require('./time');

// tslint:disable-next-line:variable-name
export const Utils = {
  ...misc,
  ...thrift,
  ...text,
  ...time
};
