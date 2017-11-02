import {
    Context,
    RestCall,
    RestResult
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

    protected server: Server;

    protected async process(ctx: Context, call: RestCall): Promise<RestResult> {
        let rsrc = call.resource;
        if (rsrc.indexOf("{") > 0) rsrc = rsrc.substring(0, rsrc.indexOf("{") - 1);
        call.path = call.path.substring(call.path.indexOf(rsrc));
        for (let p in call.queryStringParameters) {
            call.queryStringParameters[p] = encodeURIComponent(call.queryStringParameters[p]);
        }

        let app: Express = express();
        // app.use(bodyParser.json());
        // app.use(awsServerlessExpressMiddleware.eventContext());

        this.setup(app, ctx, call);

        // TODO: Complete response
        return new Promise<RestResult>((resolve, reject) => {
            this.server = awsServerlessExpress.createServer(app);
            awsServerlessExpress.proxy(this.server, call, {
                succeed: (input) => resolve({
                    statusCode: input.statusCode,
                    headers: input.headers,
                    body: input.body
                }),
                fail: (err) => reject(err)
            } as any);
        });
    }

    protected abstract setup(app: Express, ctx: Context, call: RestCall): void;

    public async release(): Promise<void> {
        if (this.server) this.server.close();
        this.server = undefined;
    }

}


