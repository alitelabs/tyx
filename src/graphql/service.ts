import { runHttpQuery } from "apollo-server-core";
import { GraphQLSchema } from "graphql";
import { RenderPageOptions, renderPlaygroundPage } from "graphql-playground-html";
import { BaseService } from "../base";
import { ContentType, Get, Inject, Post } from "../decorators";
import { InternalServerError } from "../errors";
import { GraphMetadata } from "../metadata";
import { Database } from "../orm";
import { Container, Context, GraphType, HttpRequest, HttpResponse } from "../types";
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

    @Inject(Container)
    protected container: Container;

    @Inject(Database)
    protected database: Database;

    protected schema: ToolkitSchema;
    private executable: GraphQLSchema;

    constructor(prefix: string) {
        super();
    }

    protected async activate(ctx: Context, req: HttpRequest) {
        this.schema = await this.initialize(ctx, req);
    }

    public async initialize(ctx?: Context, req?: HttpRequest): Promise<ToolkitSchema> {
        if (this.schema) return this.schema;
        let schema = new ToolkitSchema(this.database.metadata);
        for (let method of Object.values(this.container.metadata.resolverMetadata)) {
            // if (method.auth === Query.name || method)
            this.resolveType(schema, method.input);
            // let result = this.resolveType(schema, method.result);
            schema.addServiceMethod(method.service, method.method, () => null);
        }
        // FS.writeFileSync("schema.gql", schema.typeDefs());
        return schema;
    }

    private resolveType(schema: ToolkitSchema, type: GraphMetadata): string {
        // if (has) return design.name;
        // let meta = GraphMetadata.get(design.constructor);
        // if ([Result.name, ResultElement.name].includes(meta.kind)) {
        //     return this.addInput(schema, meta);
        // }
        return GraphType.Object;
    }

    // private addInput(schema: ToolkitSchema, meta: TypeMetadata): string {
    //     let ql = `input ${meta.name} {\n`;
    //     for (let [name, field] of Object.entries(meta.fields)) {
    //         let type = this.resolveType(schema, field.type);
    //     }
    // }

    @Get("/graphiql")
    @ContentType("text/html")
    public async graphiql(ctx: Context, req: HttpRequest, prefix?: string): Promise<string> {
        let options: GraphiQL.GraphiQLData = {
            endpointURL: `${prefix || ""}/graphql`,
            passHeader: ctx.auth.token ? `'Authorization': '${ctx.auth.token}'` : undefined,
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