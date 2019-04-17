import { renderPlaygroundPage } from '@apollographql/graphql-playground-html';
// tslint:disable-next-line:max-line-length
import { createPlaygroundOptions, defaultPlaygroundOptions, gql, GraphQLOptions, HttpQueryRequest, PlaygroundConfig, PlaygroundRenderPageOptions, runHttpQuery } from 'apollo-server-core';
import { GraphiQLData } from 'apollo-server-module-graphiql';
import { ProcessInfoQuery } from 'exer';
import { DocumentNode, execute, GraphQLSchema } from 'graphql';
import { ILogger, IResolvers, makeExecutableSchema, SchemaDirectiveVisitor } from 'graphql-tools';
import { Auth } from '../decorators/auth';
import { ContentType, ContextObject, Get, Post, RequestObject } from '../decorators/http';
import { CoreService, Initialize, Inject } from '../decorators/service';
import { BadRequest, InternalServerError } from '../errors';
import { Logger } from '../logger';
import { ApiMetadata } from '../metadata/api';
import { MethodMetadata } from '../metadata/method';
import { ServiceMetadata } from '../metadata/service';
import { DisplayOptions, MiddlewareOptions, renderVoyagerPage } from '../tools/voyager';
import { Configuration } from '../types/config';
import { Context } from '../types/core';
import { GraphQL } from '../types/graphql';
import { HttpRequest, HttpResponse } from '../types/http';
import { Roles } from '../types/security';
import { Core } from './core';

// tslint:disable-next-line:variable-name
const GraphiQL = require('apollo-server-module-graphiql');

export { PlaygroundRenderPageOptions, PlaygroundConfig };

@CoreService(GraphQL)
export class CoreGraphQL implements GraphQL {

  private static executable: GraphQLSchema;

  public static init(roles: Roles) {
    Auth(roles)(
      CoreGraphQL.prototype,
      'process',
      Object.getOwnPropertyDescriptor(CoreGraphQL.prototype, 'process')
    );
  }

  public static finalize() {
    ServiceMetadata.get(this).final = true;
  }

  public static get process(): MethodMetadata {
    return ApiMetadata.get(CoreGraphQL).methods['process'];
  }

  // @Logger()
  private log = Logger.get(this);

  @Inject(alias => Configuration)
  protected config: Configuration;

  // @Memento()
  // protected executable_: GraphQLSchema;

  private typeDefs?: DocumentNode | string;
  private resolvers?: IResolvers<any, Context>;
  private schemaDirectives?: Record<string, typeof SchemaDirectiveVisitor>;
  private logger?: ILogger;

  protected constructor(
    typeDefs?: DocumentNode | string,
    resolvers?: IResolvers<any, Context>,
    schemaDirectives?: Record<string, typeof SchemaDirectiveVisitor>,
    logger?: ILogger
  ) {
    this.typeDefs = typeDefs || Core.schema.typeDefs();
    this.resolvers = resolvers || Core.schema.resolvers();
    this.schemaDirectives = schemaDirectives || Core.schema.directives();
    this.logger = logger;
  }

  protected get executable() {
    return CoreGraphQL.executable;
  }

  protected set executable(val: GraphQLSchema) {
    CoreGraphQL.executable = val;
  }

  @Initialize()
  public initialize() {
    this.logger = this.logger || { log: this.log.error.bind(this.log) };
    try {
      this.executable = this.executable || makeExecutableSchema<Context>({
        typeDefs: this.typeDefs,
        resolvers: this.resolvers,
        schemaDirectives: this.schemaDirectives,
        logger: this.logger
      });
    } catch (err) {
      if (err.name === 'GraphQLError' && err.locations) {
        const loc = err.locations.map((item: any) => JSON.stringify(item)).join(',').replace(/"/g, '').replace(/,/g, ', ');
        err.message = err.message.replace('Error:', `Error: ${loc}`);
      }
      throw err;
    }
  }

  public async execute(ctx: Context, source: string, variables?: Record<string, any>): Promise<any>;
  public async execute(ctx: Context, document: DocumentNode, variables?: Record<string, any>): Promise<any>;
  public async execute(ctx: Context, oper: DocumentNode | string, variables?: Record<string, any>): Promise<any> {
    const document = typeof oper === 'string' ? gql(oper) : oper;
    const result = await execute({
      schema: this.executable,
      document,
      // rootValue?: any,
      contextValue: ctx,
      variableValues: variables || {},
      // operationName?
      // fieldResolver?
    });
    if (result.errors) {
      // TODO: Format the error
      throw new BadRequest(result.errors.map(e => e.message).join(','));
    }
    return result.data;
  }

  // TODO: Move this to httpRequest of CoreInstance
  @Get('/graphql')
  @Get('/graphiql')
  @Get('/graphql/{authorization}')
  @Post('/graphql')
  @Post('/graphql/{authorization}')
  @ContentType(HttpResponse)
  public async process(@ContextObject() ctx: Context, @RequestObject() req: HttpRequest): Promise<HttpResponse> {
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
    // console.log('HEADERS:', req.headers);
    const tracing = this.config.tracing || (req.headers['tracing'] === 'true' || req.queryStringParameters['tracing'] === 'true');
    const options: GraphQLOptions = {
      schema: this.executable,
      context: ctx,
      debug: true,
      tracing,
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
    const endpoint = `${this.config.prefix || ''}/graphql${sufix}`;
    const tabpoint = `${this.config.prefix || ''}/graphql?token=${ctx.auth.token || 'null'}`;
    const headers: any = {
      Tracing: 'true',
      Authorization: ctx.auth.token || undefined
    };
    const options = createPlaygroundOptions({
      endpoint,
      settings: {
        'editor.fontSize': 12,
        'editor.fontFamily': `'Menlo', ${defaultPlaygroundOptions.settings["editor.fontFamily"]} `,
        'editor.theme': 'light'
      },
      // workspaceName: 'SmokeTest',
      // config: {
      //   schemaPath: "schema.graphql",
      //   extensions: {
      //     endpoints: {
      //       dev: {
      //         url: `${ this.config.prefix || '' } /graphql`,
      //         headers: {
      //           Authorization: `Bearer ${ctx.auth.token}`
      //         }
      //       }
      //     }
      //   }
      // },
      tabs: [
        {
          endpoint: undefined,
          query: '# Tracing ON\n' + ProcessInfoQuery
        }
      ],
      ...custom
    });
    options.version = 'latest';
    options.tabs.forEach((tab) => {
      tab.endpoint = tabpoint;
      tab.headers = headers;
    });
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
