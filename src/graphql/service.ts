import { BaseService } from "../core";
import { ContentType, Get, Post } from "../decorators";
import { InternalServerError } from "../errors";
import { GraphQL } from "../import";
import { Inject } from "../metadata";
import { Database } from "../orm";
import { Container, Context, HttpRequest, HttpResponse } from "../types";
import { ToolkitContext, ToolkitProvider, ToolkitSchema } from "./schema";
import FS = require("fs");

const playgroundVersion = "1.6.6";
export const GraphQLApi = "graphql";

export interface GraphQLApi {
    graphql(ctx: ToolkitContext, req: HttpRequest, provider: ToolkitProvider): Promise<HttpResponse>;
    graphiql(ctx: Context, req: HttpRequest): Promise<string>;
    playground(ctx: Context, req: HttpRequest): Promise<string>;
}

export abstract class BaseGraphQLService extends BaseService implements GraphQLApi {

    @Inject(Container)
    protected container: Container;

    @Inject(Database)
    protected database: Database;

    protected schema: ToolkitSchema;
    private executable: GraphQL.GraphQLSchema;

    constructor(prefix: string) {
        super();
    }

    protected async activate(ctx: Context, req: HttpRequest) {
        this.schema = await this.initialize(ctx, req);
    }

    public async initialize(ctx?: Context, req?: HttpRequest): Promise<ToolkitSchema> {
        if (this.schema) return this.schema;
        let schema = new ToolkitSchema(this.database.metadata);
        FS.writeFileSync("schema.gql", schema.typeDefs());
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