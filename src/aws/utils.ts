
import { Express } from 'express';
import { Server } from 'http';
import { Context } from '../types/core';
import { HttpRequest, HttpResponse } from '../types/http';

export namespace LambdaUtils {
  export async function express(app: Express, ctx: Context, req: HttpRequest): Promise<HttpResponse> {
    let rsrc = req.resource;
    if (rsrc.indexOf('{') > 0) rsrc = rsrc.substring(0, rsrc.indexOf('{') - 1);
    req.path = req.path.substring(req.path.indexOf(rsrc));
    let server: Server;
    let response: HttpResponse;
    try {
      const ase = require('aws-serverless-express');
      server = ase.createServer(app);
      response = await ase.proxy(server, req, {} as any, 'PROMISE').promise as any;
    } finally {
      if (server) server.close(() => void 0);
    }
    return response;
  }
}
