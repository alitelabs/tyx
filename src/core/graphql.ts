import { CoreSchema } from '../core/schema';
import { ContentType, ContextObject, Get, Post, RequestObject } from '../decorators/http';
import { Activate, Inject, Service } from '../decorators/service';
import { InternalServerError } from '../errors';
import { DisplayOptions, MiddlewareOptions, renderVoyagerPage } from '../graphql/voyager';
import { GraphQL } from '../import';
import { Logger } from '../logger';
import { Configuration } from '../types/config';
import { Context } from '../types/core';
import { HttpRequest, HttpResponse } from '../types/http';
import SuperGraphiQL = require('super-graphiql-express');

const playgroundVersion = 'latest';

export class GraphQLApi {
  graphql(req: HttpRequest, ctx: Context): Promise<HttpResponse> {
    throw new Error();
  }
}

@Service(GraphQLApi.name)
export class CoreGraphQL extends GraphQLApi {

  private log = Logger.get(this);

  @Inject(Configuration)
  protected config: Configuration;

  protected schema: CoreSchema;
  private executable: GraphQL.GraphQLSchema;

  @Activate()
  protected async activate(ctx: Context, req: HttpRequest) {
    if (this.schema) return;
    this.schema = new CoreSchema();
  }

  // @Debug()
  @Get('/graphql')
  @Get('/graphiql')
  @Post('/graphql')
  @Get('/graphql/{authorization}')
  @Post('/graphql/{authorization}')
  @ContentType(HttpResponse)
  public async graphql(@RequestObject() req: HttpRequest, @ContextObject() ctx: Context): Promise<HttpResponse> {
    let html: string = undefined;
    if (req.resource === '/graphiql' || req.queryStringParameters.graphiql !== undefined) {
      html = await this.graphiql(req, ctx);
    } else if (req.queryStringParameters.playground !== undefined) {
      html = await this.playground(req, ctx);
    } else if (req.queryStringParameters.voyager !== undefined) {
      html = await this.voyager(req, ctx);
    } else if (req.queryStringParameters.supergraphiql !== undefined) {
      html = await this.supergraphiql(req, ctx);
    }
    if (html) return { statusCode: 200, contentType: 'text/html', body: html };
    return this.request(req, ctx);
  }

  private async request(req: HttpRequest, ctx: Context): Promise<HttpResponse> {
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

  protected async graphiql(req: HttpRequest, ctx: Context): Promise<string> {
    const options: GraphQL.GraphiQLData = {
      endpointURL: `${this.config.prefix || ''}/graphql`,
      passHeader: ctx.auth.token ? `'Authorization': '${ctx.auth.token}'` : undefined,
      // editorTheme: "idea"
    };
    try {
      return await GraphQL.GraphiQL.resolveGraphiQLString(req.queryStringParameters, options);
    } catch (error) {
      throw new InternalServerError(error.message, error);
    }
  }

  protected async playground(req: HttpRequest, ctx: Context, custom?: Partial<GraphQL.RenderPageOptions>): Promise<string> {
    const sufix = ctx.auth.token ? ('/' + ctx.auth.token) : '';
    const options: GraphQL.RenderPageOptions = {
      endpoint: `${this.config.prefix || ''}/graphql${sufix}`,
      settings: {
        'general.betaUpdates': false,
        'editor.fontSize': 14,
        'editor.fontFamily': `'Menlo', 'Source Code Pro', 'Consolas', 'Inconsolata', 'Droid Sans Mono', 'Monaco', monospace'`,
        'editor.theme': 'light',
        'editor.reuseHeaders': true,
        'request.credentials': 'omit',
        'tracing.hideTracingResponse': true,
      },
      version: playgroundVersion,
      ...custom
    };
    if (options.tabs) options.tabs.forEach(tab => tab.endpoint = options.endpoint);
    return GraphQL.renderPlaygroundPage(options);
  }

  protected async voyager(req: HttpRequest, ctx: Context, display?: Partial<DisplayOptions>): Promise<string> {
    const root = req.queryStringParameters.root;
    const options: MiddlewareOptions = {
      endpointUrl: `${this.config.prefix || ''}/graphql`,
      displayOptions: {
        rootType: root || 'Query',
        sortByAlphabet: true,
        ...display
      },
      headersJS: ctx.auth.token ? JSON.stringify({ Authorization: ctx.auth.token }) : undefined,
    };
    try {
      const html: string = renderVoyagerPage(options);
      return html;
    } catch (error) {
      throw new InternalServerError(error.message, error);
    }
  }

  protected async supergraphiql(req: HttpRequest, ctx: Context): Promise<string> {
    const options: GraphQL.GraphiQLData = {
      endpointURL: `${this.config.prefix || ''}/graphql`,
      passHeader: ctx.auth.token ? `'Authorization': '${ctx.auth.token}'` : undefined,
      // editorTheme: "idea"
    };
    try {
      let html: string = SuperGraphiQL.renderGraphiQL(options);
      if (req.sourceIp !== 'localhost' && req.sourceIp !== '::1') {
        html = html.replace('<head>', `<head><meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">`);
      }
      return html;
    } catch (error) {
      throw new InternalServerError(error.message, error);
    }
  }
}
