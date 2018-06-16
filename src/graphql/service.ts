import renderVoyagerPage, { MiddlewareOptions } from 'graphql-voyager/middleware/render-voyager-page';
import { Debug } from '../decorators/auth';
import { ContentType, ContextObject, Get, Post, RequestObject } from '../decorators/http';
import { Activate, Service } from '../decorators/service';
import { InternalServerError } from '../errors';
import { GraphQL } from '../import';
import { Logger } from '../logger';
import { Context } from '../types/core';
import { HttpRequest, HttpResponse } from '../types/http';
import { CoreSchema } from './schema';
import { ResolverContext } from './types';
import SuperGraphiQL = require('super-graphiql-express');

const playgroundVersion = 'latest';

// tslint:disable-next-line:variable-name
export const GraphQLApi = 'graphql';

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

  @Activate()
  protected async activate(ctx: Context, req: HttpRequest) {
    if (this.schema) return;
    this.schema = new CoreSchema();
  }

  @Debug()
  @Get('/graphiql')
  @ContentType('text/html')
  public async graphiql(@ContextObject() ctx: Context, @RequestObject() req: HttpRequest, prefix?: string): Promise<string> {
    const options: GraphQL.GraphiQLData = {
      endpointURL: `${prefix || ''}/graphql`,
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
  @Get('/supergraphiql')
  @ContentType('text/html')
  public async supergraphiql(@ContextObject() ctx: Context, @RequestObject() req: HttpRequest, prefix?: string): Promise<string> {
    const options: GraphQL.GraphiQLData = {
      endpointURL: `${prefix || ''}/graphql`,
      passHeader: ctx.auth.token ? `'Authorization': '${ctx.auth.token}'` : undefined,
      // editorTheme: "idea"
    };
    try {
      let html: string = SuperGraphiQL.renderGraphiQL(options);
      if (req.sourceIp !== 'localhost' && req.sourceIp !== '::1') {
        html = html.replace('<head>', `<head><meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">`);
      }
      return html;
      // return await GraphQL.GraphiQL.resolveGraphiQLString(req.queryStringParameters, options);
    } catch (error) {
      throw new InternalServerError(error.message, error);
    }
  }

  @Debug()
  @Get('/voyager')
  @ContentType('text/html')
  public async voyager(
    @RequestObject() req: HttpRequest,
    @ContextObject() ctx: Context,
    prefix?: string,
    display?: Object,
  ): Promise<string> {
    const xxx: MiddlewareOptions = {
      endpointUrl: `${prefix || ''}/graphql`,
      displayOptions: display,
      headersJS: ctx.auth.token ? JSON.stringify({ Authorization: ctx.auth.token }) : undefined,
    };
    try {
      const html: string = renderVoyagerPage(xxx);
      // if (req.sourceIp !== "localhost" && req.sourceIp !== "::1")
      //     html = html.replace("<head>", `<head><meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">`);
      return html;
      // return await GraphQL.GraphiQL.resolveGraphiQLString(req.queryStringParameters, options);
    } catch (error) {
      throw new InternalServerError(error.message, error);
    }
  }

  @Debug()
  @Get('/playground')
  @ContentType('text/html')
  public async playground(
    @ContextObject() ctx: Context,
    @RequestObject() req: HttpRequest,
    prefix?: string,
    options?: GraphQL.RenderPageOptions,
  ): Promise<string> {
    const sufix = ctx.auth.token ? ('/' + ctx.auth.token) : '';
    const fix: GraphQL.RenderPageOptions = {
      endpoint: `${prefix || ''}/graphql${sufix}`,
      // passHeader: `'Authorization': '${call.queryStringParameters.token}'`,
      version: playgroundVersion,
    };
    const ops = { ...options, ...fix };
    if (ops.tabs) ops.tabs.forEach(tab => tab.endpoint = ops.endpoint);
    return await GraphQL.renderPlaygroundPage(ops);
  }

  @Debug()
  @Get('/graphql')
  @Post('/graphql', false)
  @Get('/graphql/{authorization}')
  @Post('/graphql/{authorization}', false)
  @ContentType(HttpResponse)
  public async graphql(@ContextObject() ctx: ResolverContext, @RequestObject() req: HttpRequest): Promise<HttpResponse> {
    this.executable = this.executable || this.schema.executable({ log: msg => this.log.info(msg) });
    const options = {
      schema: this.executable,
      formatError: (err: any) => ({
        message: err.message,
        code: err.originalError && err.originalError.code,
        locations: err.locations,
        path: err.path,
      }),
      context: ctx as any,
    };
    const query = req.json || req.queryStringParameters;
    const result: HttpResponse = { statusCode: null, body: null, headers: {} };
    try {
      result.body = await GraphQL.runHttpQuery([req, ctx], { method: req.httpMethod, options, query });
      result.headers['Content-Type'] = 'application/json';
      result.statusCode = 200;
    } catch (error) {
      if (error.name === 'HttpQueryError') throw error;
      result.headers = error.headers;
      result.statusCode = error.statusCode;
      result.body = error.message;
    }
    return result;
  }
}
