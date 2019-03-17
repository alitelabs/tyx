import { renderPlaygroundPage } from '@apollographql/graphql-playground-html';
// tslint:disable-next-line:max-line-length
import { createPlaygroundOptions, defaultPlaygroundOptions, GraphQLOptions, HttpQueryRequest, PlaygroundConfig, PlaygroundRenderPageOptions, runHttpQuery } from 'apollo-server-core';
import { GraphiQLData } from 'apollo-server-module-graphiql';
import { GraphQLSchema } from 'graphql';
import { Public } from '../decorators/auth';
import { ContentType, ContextObject, Get, Post, RequestObject } from '../decorators/http';
import { Activate, CoreService, Inject } from '../decorators/service';
import { InternalServerError } from '../errors';
import { CoreSchema } from '../graphql/schema';
import { Logger } from '../logger';
import { DisplayOptions, MiddlewareOptions, renderVoyagerPage } from '../tools/voyager';
import { Configuration } from '../types/config';
import { Context } from '../types/core';
import { GraphQL } from '../types/graphql';
import { HttpRequest, HttpResponse } from '../types/http';
import { Core } from './core';

// tslint:disable-next-line:variable-name
const GraphiQL = require('apollo-server-module-graphiql');

export { PlaygroundRenderPageOptions, PlaygroundConfig };

@CoreService(GraphQL)
export class CoreGraphQL implements GraphQL {

  public static makePublic() {
    Public()(
      CoreGraphQL.prototype,
      'graphql',
      Object.getOwnPropertyDescriptor(CoreGraphQL.prototype, 'graphql')
    );
  }

  private log = Logger.get(this);

  @Inject(Configuration)
  protected config: Configuration;

  protected schema: CoreSchema;
  private executable: GraphQLSchema;

  @Activate()
  protected async activate(ctx: Context, req: HttpRequest) {
    if (this.schema) return;
    // TODO: Instance schema per user role
    this.schema = Core.schema;
  }

  // TODO: Move this to httpRequest of CoreInstance
  @Get('/graphql')
  @Get('/graphiql')
  @Post('/graphql')
  @Get('/graphql/{authorization}')
  @Post('/graphql/{authorization}')
  @ContentType(HttpResponse)
  public async graphql(@ContextObject() ctx: Context, @RequestObject() req: HttpRequest): Promise<HttpResponse> {
    if (req.httpMethod !== 'GET') {
      return this.request(ctx, req);
    }
    let html: string = undefined;
    if (req.resource === '/graphiql' || req.queryStringParameters.graphiql !== undefined) {
      html = await this.graphiql(ctx, req);
    } else if (req.queryStringParameters.voyager !== undefined) {
      html = await this.voyager(ctx, req);
    } else {
      html = await this.playground(ctx, req);
    }
    return { statusCode: 200, contentType: 'text/html', body: html };
  }

  private async request(ctx: Context, req: HttpRequest): Promise<HttpResponse> {
    this.executable = this.executable || this.schema.executable({ log: msg => this.log.info(msg) });
    const options: GraphQLOptions = {
      schema: this.executable,
      context: ctx,
      debug: true,
      tracing: this.config.tracing,
      formatError: (err: any) => {
        err.code = err.originalError && err.originalError.code;
        return err;
      }
    };
    const httpReq: HttpQueryRequest = {
      method: req.httpMethod,
      options,
      query: req.json || req.queryStringParameters,
      request: {
        url: req.path,
        method: req.httpMethod,
        headers: req.headers as any
      }
    };
    try {
      const { graphqlResponse, responseInit } = await runHttpQuery([req, ctx], httpReq);
      return {
        statusCode: 200,
        headers: responseInit.headers,
        body: graphqlResponse
      };
    } catch (error) {
      if ('HttpQueryError' !== error.name) throw error;
      return {
        statusCode: 200, // error.statusCode;
        headers: error.headers,
        body: error.message
      };
    }
  }

  protected async graphiql(ctx: Context, req: HttpRequest): Promise<string> {
    const options: GraphiQLData = {
      endpointURL: `${this.config.prefix || ''}/graphql`,
      passHeader: ctx.auth.token ? `'Authorization': '${ctx.auth.token}'` : undefined,
      // editorTheme: "idea"
    };
    try {
      return await GraphiQL.resolveGraphiQLString(req.queryStringParameters, options);
    } catch (error) {
      throw new InternalServerError(error.message, error);
    }
  }

  protected async playground(ctx: Context, req: HttpRequest, custom?: Partial<PlaygroundRenderPageOptions>): Promise<string> {
    const sufix = ctx.auth.token ? ('/' + ctx.auth.token) : '';
    const options = createPlaygroundOptions({
      endpoint: `${this.config.prefix || ''}/graphql${sufix}`,
      settings: {
        'editor.fontSize': 12,
        'editor.fontFamily': `'Menlo', ${defaultPlaygroundOptions.settings["editor.fontFamily"]}`,
        'editor.theme': 'light'
      },
      // workspaceName: 'SmokeTest',
      // config: {
      //   schemaPath: "schema.graphql",
      //   extensions: {
      //     endpoints: {
      //       dev: {
      //         url: `${this.config.prefix || ''}/graphql`,
      //         headers: {
      //           Authorization: `Bearer ${ctx.auth.token}`
      //         }
      //       }
      //     }
      //   }
      // },
      ...custom
    });
    if (options.tabs) options.tabs.forEach(tab => tab.endpoint = options.endpoint);
    return renderPlaygroundPage(options || options);
  }

  protected async voyager(ctx: Context, req: HttpRequest, display?: Partial<DisplayOptions>): Promise<string> {
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
}
