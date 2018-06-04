import { BaseService } from "../core/service";
import { Database } from "../decorators/database";
import { ContentType, Get, Post } from "../decorators/http";
import { Activator, Inject } from "../decorators/service";
import { InternalServerError } from "../errors";
import { GraphQL } from "../import";
import { Context } from "../types/core";
import { HttpRequest, HttpResponse } from "../types/http";
import { CoreSchema } from "./schema";
import { EntityResolver, ResolverContext } from "./types";

const playgroundVersion = "latest";
export const GraphQLApi = "graphql";

export interface GraphQLApi {
    graphql(ctx: ResolverContext, req: HttpRequest, provider: EntityResolver): Promise<HttpResponse>;
    graphiql(ctx: Context, req: HttpRequest): Promise<string>;
    playground(ctx: Context, req: HttpRequest): Promise<string>;
}

export abstract class BaseGraphQLService extends BaseService implements GraphQLApi {

    @Inject(Database)
    protected database: Database;

    protected schema: CoreSchema;
    private executable: GraphQL.GraphQLSchema;

    constructor(prefix: string) {
        super();
    }

    @Activator()
    protected async activate(ctx: Context, req: HttpRequest) {
        if (this.schema) return;
        this.schema = await this.initialize();
    }

    protected async initialize(): Promise<CoreSchema> {
        let schema = new CoreSchema();
        return schema;
    }

    @Get("/graphiql")
    @ContentType("text/html")
    public async graphiql(ctx: Context, req: HttpRequest, prefix?: string): Promise<string> {
        let options: GraphQL.GraphiQLData = {
            endpointURL: `${prefix || ""}/graphql`,
            passHeader: ctx.auth.token ? `'Authorization': '${ctx.auth.token}'` : undefined,
            // editorTheme: "idea"
        };
        try {
            return await GraphQL.GraphiQL.resolveGraphiQLString(req.queryStringParameters, options);
        } catch (error) {
            throw new InternalServerError(error.message, error);
        }
    }

    @Get("/playgound")
    @ContentType("text/html")
    public async playground(ctx: Context, req: HttpRequest, prefix?: string): Promise<string> {
        let sufix = ctx.auth.token ? ("/" + ctx.auth.token) : "";
        const options: GraphQL.RenderPageOptions = {
            endpoint: `${prefix || ""}/graphql${sufix}`,
            // passHeader: `'Authorization': '${call.queryStringParameters.token}'`,
            version: playgroundVersion
        };
        return await GraphQL.renderPlaygroundPage(options);
    }

    @Get("/graphql")
    @Post("/graphql", false)
    @Get("/graphql/{authorization}")
    @Post("/graphql/{authorization}", false)
    @ContentType(HttpResponse)
    public async graphql(ctx: ResolverContext, req: HttpRequest): Promise<HttpResponse> {
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