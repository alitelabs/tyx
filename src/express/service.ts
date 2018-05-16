import {
    Context,
    HttpRequest,
    HttpResponse
} from "../core/types";

import {
    BaseService
} from "../core/base";

import { Server } from "http";
import { Express } from "express";
export { Express };

import awsServerlessExpress = require("aws-serverless-express");
import express = require("express");

export abstract class ExpressService extends BaseService {

    private server: Server;

    protected async process(ctx: Context, req: HttpRequest): Promise<HttpResponse> {
        let rsrc = req.resource;
        if (rsrc.indexOf("{") > 0) rsrc = rsrc.substring(0, rsrc.indexOf("{") - 1);
        req.path = req.path.substring(req.path.indexOf(rsrc));

        let app: Express = express();
        // app.use(bodyParser.json());
        // app.use(awsServerlessExpressMiddleware.eventContext());

        this.setup(app, ctx, req);

        // TODO: Complete response
        return new Promise<HttpResponse>((resolve, reject) => {
            this.server = awsServerlessExpress.createServer(app);
            awsServerlessExpress.proxy(this.server, req, {
                succeed: (input) => resolve({
                    statusCode: input.statusCode,
                    headers: input.headers,
                    body: input.body
                }),
                fail: (err) => reject(err)
            } as any);
        });
    }

    protected abstract setup(app: Express, ctx: Context, req: HttpRequest): void;

    public async release(): Promise<void> {
        if (this.server) this.server.close();
        this.server = undefined;
    }

}


