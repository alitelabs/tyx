import { runHttpQuery } from "apollo-server-core";
import { GraphQLSchema } from "graphql";
import { RenderPageOptions, renderPlaygroundPage } from "graphql-playground-html";
import { BaseService } from "../base";
import { ContentType, Get, Post } from "../decorators";
import { InternalServerError } from "../errors";
import { Context, HttpRequest, HttpResponse } from "../types";
import { ToolkitContext, ToolkitProvider, ToolkitSchema } from "./schema";
import GraphiQL = require("apollo-server-module-graphiql");

const playgroundVersion = "1.6.6";

export const GraphQLApi = "graphql";

export interface GraphQLApi {
    graphql(ctx: ToolkitContext, req: HttpRequest, provider: ToolkitProvider): Promise<HttpResponse>;
    graphiql(ctx: Context, req: HttpRequest): Promise<string>;
    playground(ctx: Context, req: HttpRequest): Promise<string>;
}

export abstract class BaseGraphQLService extends BaseService implements GraphQLApi {

    protected schema: ToolkitSchema;
    private executable: GraphQLSchema;

    constructor(prefix: string) {
        super();
    }

    protected abstract initialize(ctx?: Context, req?: HttpRequest): Promise<ToolkitSchema>;

    protected async activate(ctx: Context, req: HttpRequest) {
        this.schema = await this.initialize(ctx, req);
    }

    @Get("/graphiql")
    @ContentType("text/html")
    public async graphiql(ctx: Context, req: HttpRequest, prefix?: string): Promise<string> {
        let options: GraphiQL.GraphiQLData = {
            endpointURL: `${prefix || ""}/graphql`,
            passHeader: `'Authorization': '${req.queryStringParameters.token}'`,
            // editorTheme: "idea"
        };
        try {
            return await GraphiQL.resolveGraphiQLString(req.queryStringParameters, options);
        } catch (error) {
            throw new InternalServerError(error.message, error);
        }
    }

    @Get("/playgound")
    @ContentType("text/html")
    public async playground(ctx: Context, req: HttpRequest, prefix?: string): Promise<string> {
        let sufix = ctx.auth.token ? ("/" + ctx.auth.token) : "";
        const options: RenderPageOptions = {
            endpoint: `${prefix || ""}/graphql${sufix}`,
            // passHeader: `'Authorization': '${call.queryStringParameters.token}'`,
            version: playgroundVersion
        };
        return await renderPlaygroundPage(options);
    }

    @Get("/graphql")
    @Post("/graphql", false)
    @Get("/graphql/{authorization}")
    @Post("/graphql/{authorization}", false)
    @ContentType(HttpResponse)
    public async graphql(ctx: ToolkitContext, req: HttpRequest): Promise<HttpResponse> {
        this.executable = this.executable || this.schema.executable({ log: (msg) => this.log.info(msg) });
        let options = {
            schema: this.executable,
            formatError: (err) => ({
                message: err.message,
                code: err.originalError && err.originalError.code,
                locations: err.locations,
                path: err.path
            }),
            context: ctx as any
        };
        let query = req.json || req.queryStringParameters;
        let result: HttpResponse = { statusCode: null, body: null, headers: {} };
        try {
            // : GraphContext = { ...ctx, db: this.database.getConnection() };
            result.body = await runHttpQuery([req, ctx], { method: req.httpMethod, options, query });
            result.headers["Content-Type"] = "application/json";
            result.statusCode = 200;
        } catch (error) {
            if (error.name === "HttpQueryError") throw error;
            result.headers = error.headers;
            result.statusCode = error.statusCode;
            result.body = error.message;
        }
        return result;
    }
}