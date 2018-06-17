import { InternalServerError, NotFound } from '../errors/http';
import { CoreGraphQLService, GraphQLApi } from '../graphql';
import { MethodInfo, ResolverArgs, ResolverContext, ResolverInfo, ResolverQuery } from '../graphql/types';
import { Container, ContainerInstance } from '../import/typedi';
import { Logger } from '../logger';
import { EventRouteMetadata, HttpRouteMetadata, MethodMetadata } from '../metadata/method';
import { ProxyMetadata } from '../metadata/proxy';
import { Registry } from '../metadata/registry';
import { ServiceMetadata } from '../metadata/service';
import { GraphKind } from '../metadata/type';
import { Configuration } from '../types/config';
import { ContainerState, Context, CoreContainer, ObjectType } from '../types/core';
import { EventRequest, EventResult } from '../types/event';
import { GraphRequest } from '../types/graphql';
import { HttpRequest, HttpResponse } from '../types/http';
import { RemoteRequest } from '../types/proxy';
import { Security } from '../types/security';
import { Utils } from '../utils';
import { CoreConfiguration } from './config';
import { HttpUtils } from './http';
import { CoreSecurity } from './security';

export class CoreInstance implements CoreContainer {

  private application: string;
  private name: string;
  public log: Logger;

  private container: ContainerInstance;
  private config: Configuration;
  private security: Security;
  private istate: ContainerState;

  private services: object[] = [];

  constructor(application: string, name: string, index?: number) {
    this.application = application;
    this.name = name || CoreInstance.name;
    if (index !== undefined) this.name += ':' + index;

    this.container = Container.of(this.name);
    this.container.set(CoreContainer, this);

    this.log = Logger.get(this.application, this.name);
    this.istate = ContainerState.Pending;

    // if (this.istate !== ContainerState.Pending) throw new InternalServerError("Invalid container state");

    if (!Container.has(Configuration)) {
      this.log.warn('Using default configuration service!');
      this.container.set({ id: Configuration, type: CoreConfiguration });
    }
    this.config = this.container.get(Configuration);
    if (this.config instanceof CoreConfiguration) {
      this.config.init(this.application);
    } else if (!ServiceMetadata.has(this.config)) {
      throw new TypeError(`Configuration must be a service`);
    }

    if (!Container.has(Security)) {
      this.log.warn('Using default security service!');
      this.container.set({ id: Security, type: CoreSecurity });
    }
    this.security = this.container.get(Security);
    if (this.security instanceof CoreSecurity) {
      // OK
    } else if (!ServiceMetadata.has(this.security)) {
      throw new TypeError(`Security must be a service`);
    }

    if (!Container.has(GraphQLApi)) {
      this.container.set({ id: GraphQLApi, type: CoreGraphQLService });
    }

    this.istate = ContainerState.Ready;
  }

  public get state() {
    return this.istate;
  }

  public reserve() {
    if (this.istate !== ContainerState.Ready) {
      throw new InternalServerError('Invalid container state');
    }
    this.istate = ContainerState.Reserved;
  }

  public get<T>(type: ObjectType<T> | string): T {
    if (typeof type === 'string') return this.container.get<T>(type);
    const proxy = ProxyMetadata.get(type);
    if (proxy) return this.container.get(proxy.alias);
    const service = ServiceMetadata.get(type);
    if (service) return this.container.get(service.alias);
    return undefined;
  }

  // --------------------------------------------------

  public async invoke(
    method: MethodInfo,
    obj: any,
    input: ResolverQuery & ResolverArgs,
    ctx?: ResolverContext,
    info?: ResolverInfo,
  ): Promise<any> {
    return this.graphRequest(
      {
        type: 'graphql',
        requestId: ctx.requestId,
        sourceIp: ctx.sourceIp,
        application: this.application,
        service: method.api,
        method: method.method,
        obj,
        args: input,
        info,
        token: ctx.auth.token,
      },
      true,
    );
  }

  public async httpRequest(req: HttpRequest): Promise<HttpResponse> {
    if (this.istate !== ContainerState.Reserved) throw new InternalServerError('Invalid container state');
    try {
      req.type = 'http';
      this.log.debug('HTTP Event: %j', req);

      HttpUtils.request(req);

      const route = HttpRouteMetadata.route(req.httpMethod, req.resource, req.contentType.domainModel);
      const target = Registry.HttpRouteMetadata[route];
      if (!target) throw this.log.error(new NotFound(`Route not found [${route}]`));
      const service = this.container.get<any>(target.alias);
      if (!service) throw this.log.error(new NotFound(`Service not found [${req.service}]`));
      const methodId = MethodMetadata.id(target.alias, target.handler);
      const method = Registry.MethodMetadata[methodId] as MethodMetadata;

      req.application = this.application;
      req.service = target.alias;
      req.method = target.handler;

      this.istate = ContainerState.Busy;
      const ctx = await this.security.httpAuth(this, req, method);

      const log = Logger.get(service);
      const startTime = log.time();
      try {
        await this.activate(ctx);

        this.log.debug('HTTP Context: %j', ctx);
        this.log.debug('HTTP Request: %j', req);

        const handler: Function = service[method.name];
        const http = method.http[route];
        let result: any;
        if (http.adapter) {
          result = await http.adapter(
            handler.bind(service),
            ctx,
            req,
            req.pathParameters || {},
            req.queryStringParameters || {});
        } else {
          const args: any = [];
          for (const [index, arg] of method.bindings.entries()) {
            args[index] = (arg.binder ? arg.binder(ctx, req) : undefined);
          }
          result = await handler.apply(service, args);
        }

        const contentType = method.contentType || 'application/json';
        if (contentType !== HttpResponse) result = { statusCode: http.code, body: result, contentType };
        if (ctx && ctx.auth.renewed && ctx.auth.token) {
          result.headers = result.headers || {};
          result.headers['Token'] = ctx.auth.token;
        }
        this.log.debug('Response: %j', result);
        return result;
      } catch (e) {
        this.log.error(e);
        throw InternalServerError.wrap(e);
      } finally {
        log.timeEnd(startTime, `${method.name}`);
        await this.release(ctx);
      }
    } finally {
      this.istate = ContainerState.Ready;
    }
  }

  public async graphRequest(req: GraphRequest, reenter?: boolean): Promise<any> {
    if (!reenter && this.istate !== ContainerState.Reserved) throw new InternalServerError('Invalid container state');
    try {
      this.log.debug('GraphQL Request: %j', req);

      if (req.application !== this.application) throw this.log.error(new NotFound(`Application not found [${req.application}]`));
      const service = this.container.get<any>(req.service);
      if (!service) throw this.log.error(new NotFound(`Service not found [${req.service}]`));
      const methodId = MethodMetadata.id(req.service, req.method);
      const metadata = Registry.MethodMetadata[methodId];
      if (!metadata) throw this.log.error(new NotFound(`Method not found [${methodId}]`));

      this.istate = ContainerState.Busy;
      const ctx = await this.security.graphAuth(this, req, metadata);

      const log = Logger.get(service);
      const startTime = log.time();
      try {
        await this.activate(ctx);
        const handler: Function = service[metadata.name];
        let result: any;
        if (metadata.resolver) {
          result = await handler.call(service, req.obj, req.args, ctx, req.info);
        } else if (metadata.input.kind === GraphKind.Void) {
          result = await handler.call(service, ctx);
        } else {
          result = await handler.call(service, req.args, ctx);
        }
        return result;
      } catch (e) {
        throw this.log.error(e);
      } finally {
        log.timeEnd(startTime, `${metadata.name}`);
        if (!reenter) await this.release(ctx);
      }
    } finally {
      if (!reenter) this.istate = ContainerState.Ready;
    }
  }

  public async remoteRequest(req: RemoteRequest): Promise<any> {
    if (this.istate !== ContainerState.Reserved) throw new InternalServerError('Invalid container state');
    try {
      this.log.debug('Remote Request: %j', req);

      if (req.application !== this.application) throw this.log.error(new NotFound(`Application not found [${req.application}]`));
      const service = this.container.get<any>(req.service);
      if (!service) throw this.log.error(new NotFound(`Service not found [${req.service}]`));
      const methodId = MethodMetadata.id(req.service, req.method);
      const metadata = Registry.MethodMetadata[methodId];
      if (!metadata) throw this.log.error(new NotFound(`Method not found [${methodId}]`));

      this.istate = ContainerState.Busy;
      const ctx = await this.security.remoteAuth(this, req, metadata);

      const log = Logger.get(service);
      const startTime = log.time();
      try {
        await this.activate(ctx);
        const handler: Function = service[metadata.name];
        const result = await handler.apply(service, req.args);
        return result;
      } catch (e) {
        throw this.log.error(e);
      } finally {
        log.timeEnd(startTime, `${metadata.name}`);
        await this.release(ctx);
      }
    } finally {
      this.istate = ContainerState.Ready;
    }
  }

  public async eventRequest(req: EventRequest): Promise<EventResult> {
    if (this.istate !== ContainerState.Reserved) throw new InternalServerError('Invalid container state');
    try {
      req.type = 'event';
      this.log.debug('Event Request: %j', req);

      let route = EventRouteMetadata.route(req.source, req.resource);
      const alias = this.config.resources && this.config.resources[req.resource];
      let metadatas = Registry.EventRouteMetadata[route];
      if (!metadatas) {
        route = EventRouteMetadata.route(req.source, alias);
        metadatas = Registry.EventRouteMetadata[route];
      }
      if (!metadatas) throw this.log.error(new NotFound(`Event handler not found [${route}] [${req.object}]`));

      const result: EventResult = {
        status: null,
        source: req.source,
        action: req.action,
        resource: req.resource,
        object: req.object,
        returns: [],
      };

      this.istate = ContainerState.Busy;
      for (const target of metadatas) {
        const service = this.container.get<any>(target.alias);
        if (!service) throw this.log.error(new NotFound(`Service not found [${req.service}]`));
        const methodId = MethodMetadata.id(target.alias, target.handler);
        const method = Registry.MethodMetadata[methodId];

        if (!Utils.wildcardMatch(target.actionFilter, req.action)
          || !Utils.wildcardMatch(target.objectFilter, req.object)) continue;

        req.application = this.application;
        req.service = target.alias;
        req.method = target.handler;

        const ctx = await this.security.eventAuth(this, req, method);

        const log = Logger.get(service);
        const startTime = log.time();
        try {
          await this.activate(ctx);
          for (const record of req.records) {
            req.record = record;
            const handler = service[target.handler];
            let data: any;
            if (target.adapter) {
              data = await target.adapter(handler.bind(service), ctx, req);
            } else {
              data = await handler.call(service, ctx, req);
            }
            result.status = result.status || 'OK';
            result.returns.push({
              service: target.alias,
              method: target.handler,
              error: null,
              data,
            });
          }
        } catch (e) {
          this.log.error(e);
          result.status = 'FAILED';
          result.returns.push({
            service: target.alias,
            method: target.handler,
            error: InternalServerError.wrap(e),
            data: null,
          });
        } finally {
          log.timeEnd(startTime, `${target.handler}`);
          await this.release(ctx);
        }
      }
      result.status = result.status || 'NOP';
      return result;
    } finally {
      this.istate = ContainerState.Ready;
    }
  }

  public async activate(ctx: Context): Promise<Context> {
    for (const [sid, meta] of Object.entries(Registry.ServiceMetadata)) {
      if (!meta.activator) continue;
      if (!this.container.has(sid)) continue;
      try {
        const service = this.container.get<any>(sid);
        if (this.services.includes(service)) continue;
        const handler = service[meta.activator.method] as Function;
        await handler.call(service, ctx);
        this.services.push(service);
      } catch (e) {
        this.log.error('Failed to activate service: [%s]', sid);
        this.log.error(e);
        throw e;
        // TODO: Error state for container
      }
    }
    return ctx;
  }

  public async release(ctx: Context): Promise<void> {
    for (const [sid, meta] of Object.entries(Registry.ServiceMetadata)) {
      if (!meta.releasor) continue;
      if (!this.container.has(sid)) continue;
      try {
        const service = this.container.get<any>(sid);
        const handler = service[meta.releasor.method] as Function;
        await handler.call(service, ctx);
      } catch (e) {
        this.log.error('Failed to release service: [%s]', sid);
        this.log.error(e);
        // TODO: Error state for container
      }
    }
    this.services = [];
  }
}
