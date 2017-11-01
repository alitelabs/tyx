
import {
    Service,
    ExpressService,
    Context,
    RestCall,
    Public,
    Get,
    Post,
    Put,
    Delete,
    ContextObject,
    ContentType,
    CallObject,
    RestResult
} from "../../../src";

import {
    Express,
    Request,
    Response
} from "express";

import {
    ExampleApi
} from "../api/example";

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
    @ContentType("RAW")
    public async onGet(@ContextObject() ctx: Context, @CallObject() call: RestCall): Promise<RestResult> {
        return super.process(ctx, call);
    }

    @Public()
    @Post("/app")
    @ContentType("RAW")
    public async onPost(@ContextObject() ctx: Context, @CallObject() call: RestCall): Promise<RestResult> {
        return super.process(ctx, call);
    }

    @Public()
    @Put("/app")
    @Delete("/app/{id}")
    @ContentType("RAW")
    public async other(@ContextObject() ctx: Context, @CallObject() call: RestCall): Promise<RestResult> {
        return super.process(ctx, call);
    }

    protected setup(app: Express, ctx: Context, call: RestCall): void {
        app.use(BodyParser.json());

        app.get("/app", (req, res) => this.flush(req, res, ctx, call));
        app.post("/app", (req, res) => this.flush(req, res, ctx, call));
        app.put("/app", (req, res) => this.flush(req, res, ctx, call));
        app.delete("/app/:id", (req, res) => this.flush(req, res, ctx, call));
    }

    private flush(req: Request, res: Response, ctx: Context, call: RestCall) {
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