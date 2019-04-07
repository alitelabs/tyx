import 'reflect-metadata';
import misc = require('./misc');
import thrift = require('./thrift');
import text = require('./text');
import time = require('./time');
import file = require('./file');
import js = require('./js');
import lodash = require('./lodash');

// tslint:disable-next-line:variable-name
export const Utils = {
  ...misc,
  ...thrift,
  ...text,
  ...time,
  ...file,
  ...js,
  ...lodash
};
