import { Express as IExpress, Request as ExpressRequest, Response as ExpressResponse } from 'express';

export namespace Express {
  export interface Express extends IExpress { }
  export interface Request extends ExpressRequest { }
  export interface Response extends ExpressResponse { }

  let expressModule: any = undefined;
  let bodyParserModule: any = undefined;
  let awsExpressModule: any = undefined;

  export function load(req?: boolean): boolean {
    if (!req && expressModule !== undefined
      && bodyParserModule !== undefined
      // && rawBodyModule !== undefined
    ) return !!expressModule;
    try {
      expressModule = require('express');
      bodyParserModule = require('body-parser');
      awsExpressModule = require('aws-serverless-express');
    } catch (err) {
      expressModule = null;
      if (req) throw err;
    }
    return !!expressModule && !!bodyParserModule && !!awsExpressModule;
  }

  export function create(): Express {
    load(true);
    return expressModule();
  }

  export function bodyParser(opts?: any) {
    load(true);
    return bodyParserModule;
  }
}
