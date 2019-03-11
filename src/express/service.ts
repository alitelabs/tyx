
import { Server } from 'http';
import { Aws, Express } from '../import';
import { Context } from '../types/core';
import { HttpRequest, HttpResponse } from '../types/http';

export abstract class ExpressService {

  protected async process(ctx: Context, req: HttpRequest): Promise<HttpResponse> {
    let rsrc = req.resource;
    if (rsrc.indexOf('{') > 0) rsrc = rsrc.substring(0, rsrc.indexOf('{') - 1);
    req.path = req.path.substring(req.path.indexOf(rsrc));
    const app: Express.Express = Express.Create();
    await this.prepare(app, ctx, req);
    let server: Server;
    let response: HttpResponse;
    try {
      server = Aws.ServerlessExpress.createServer(app);
      response = await Aws.ServerlessExpress.proxy(server, req, {} as any, 'PROMISE').promise as any;
    } finally {
      if (server) server.close(() => void 0);
      await this.destroy(app, ctx, response);
    }
    return response;
  }

  protected abstract async prepare(app: Express.Express, ctx: Context, req: HttpRequest): Promise<void>;

  protected abstract async destroy(app?: Express.Express, ctx?: Context, res?: HttpResponse): Promise<void>;
}
