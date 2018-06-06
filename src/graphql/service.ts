import { Debug } from "../decorators/auth";
import { ContentType, ContextObject, Get, Post, RequestObject } from "../decorators/http";
import { Activator, Service } from "../decorators/service";
import { InternalServerError } from "../errors";
import { GraphQL } from "../import";
import { Logger } from "../logger";
import { Context } from "../types/core";
import { HttpRequest, HttpResponse } from "../types/http";
import { CoreSchema } from "./schema";
import { ResolverContext } from "./types";
import SuperGraphiQL = require("super-graphiql-express");

const playgroundVersion = "latest";
export const GraphQLApi = "graphql";

export interface GraphQLApi {
    graphql(ctx: ResolverContext, req: HttpRequest): Promise<HttpResponse>;
    graphiql(ctx: Context, req: HttpRequest): Promise<string>;
    playground(ctx: Context, req: HttpRequest): Promise<string>;
}

@Service(GraphQLApi)
export class CoreGraphQLService implements GraphQLApi {

    private log = Logger.get(this);

    // @Inject(Database)
    // protected database: Database;

    protected schema: CoreSchema;
    private executable: GraphQL.GraphQLSchema;

    @Activator()
    protected async activate(ctx: Context, req: HttpRequest) {
        if (this.schema) return;
        this.schema = new CoreSchema();
    }

    @Debug()
    @Get("/graphiql")
    @ContentType("text/html")
    public async graphiql(@ContextObject() ctx: Context, @RequestObject() req: HttpRequest, prefix?: string): Promise<string> {
        let options: GraphQL.GraphiQLData = {
            endpointURL: `${prefix || ""}/graphql`,
            passHeader: ctx.auth.token ? `'Authorization': '${ctx.auth.token}'` : undefined,
            // editorTheme: "idea"
        };
        try {
            // let html: string = SuperGraphiQL.renderGraphiQL(options);
            // if (req.sourceIp !== "localhost" && req.sourceIp !== "::1")
            //     html = html.replace("<head>", `<head><meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">`);
            // return html;
            return await GraphQL.GraphiQL.resolveGraphiQLString(req.queryStringParameters, options);
        } catch (error) {
            throw new InternalServerError(error.message, error);
        }
    }

    @Debug()
    @Get("/supergraphiql")
    @ContentType("text/html")
    public async supergraphiql(@ContextObject() ctx: Context, @RequestObject() req: HttpRequest, prefix?: string): Promise<string> {
        let options: GraphQL.GraphiQLData = {
            endpointURL: `${prefix || ""}/graphql`,
            passHeader: ctx.auth.token ? `'Authorization': '${ctx.auth.token}'` : undefined,
            // editorTheme: "idea"
        };
        try {
            let html: string = SuperGraphiQL.renderGraphiQL(options);
            if (req.sourceIp !== "localhost" && req.sourceIp !== "::1")
                html = html.replace("<head>", `<head><meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">`);
            return html;
            // return await GraphQL.GraphiQL.resolveGraphiQLString(req.queryStringParameters, options);
        } catch (error) {
            throw new InternalServerError(error.message, error);
        }
    }

    @Debug()
    @Get("/playground")
    @ContentType("text/html")
    public async playground(@ContextObject() ctx: Context, @RequestObject() req: HttpRequest, prefix?: string): Promise<string> {
        let sufix = ctx.auth.token ? ("/" + ctx.auth.token) : "";
        const options: GraphQL.RenderPageOptions = {
            endpoint: `${prefix || ""}/graphql${sufix}`,
            // passHeader: `'Authorization': '${call.queryStringParameters.token}'`,
            version: playgroundVersion
        };
        return await GraphQL.renderPlaygroundPage(options);
    }

    @Debug()
    @Get("/graphql")
    @Post("/graphql", false)
    @Get("/graphql/{authorization}")
    @Post("/graphql/{authorization}", false)
    @ContentType(HttpResponse)
    public async graphql(@ContextObject() ctx: ResolverContext, @RequestObject() req: HttpRequest): Promise<HttpResponse> {
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
            result.body = await GraphQL.runHttpQuery([req, ctx], { method: req.httpMethod, options, query });
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