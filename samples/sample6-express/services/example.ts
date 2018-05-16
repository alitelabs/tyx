
import { Express, Request, Response } from "express";
import { CallObject, ContentType, Context, ContextObject, Delete, ExpressService, Get, HttpCall, HttpResponse, Post, Public, Put, Service } from "../../../src";
import { ExampleApi } from "../api/example";

import BodyParser = require("body-parser");

@Service(ExampleApi)
export class ExampleService extends ExpressService implements ExampleApi {

    @Public()
    @Get("/hello")
    @ContentType("text/plain")
    public hello(): string {
        return "Express service ...";
    }

    @Public()
    @Get("/app")
    @ContentType(HttpResponse)
    public async onGet(@ContextObject() ctx: Context, @CallObject() call: HttpCall): Promise<HttpResponse> {
        return super.process(ctx, call);
    }

    @Public()
    @Post("/app")
    @ContentType(HttpResponse)
    public async onPost(@ContextObject() ctx: Context, @CallObject() call: HttpCall): Promise<HttpResponse> {
        return super.process(ctx, call);
    }

    @Public()
    @Put("/app")
    @Delete("/app/{id}")
    @ContentType(HttpResponse)
    public async other(@ContextObject() ctx: Context, @CallObject() call: HttpCall): Promise<HttpResponse> {
        return super.process(ctx, call);
    }

    protected setup(app: Express, ctx: Context, call: HttpCall): void {
        app.use(BodyParser.json());

        app.get("/app", (req, res) => this.flush(req, res, ctx, call));
        app.post("/app", (req, res) => this.flush(req, res, ctx, call));
        app.put("/app", (req, res) => this.flush(req, res, ctx, call));
        app.delete("/app/:id", (req, res) => this.flush(req, res, ctx, call));
    }

    private flush(req: Request, res: Response, ctx: Context, call: HttpCall) {
        let result = {
            msg: `Express ${req.method} method`,
            path: req.path,
            method: req.method,
            headers: req.headers,
            params: req.params,
            query: req.query,
            body: req.body,
            lambda: { ctx, call }
        };
        res.send(result);
    }
}