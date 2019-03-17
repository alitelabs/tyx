import { Forbidden, InternalServerError } from '../errors/http';
import { MethodInfo, ResolverArgs, ResolverContext, ResolverInfo, ResolverQuery } from '../graphql/types';
import { Di } from '../import';
import { Logger } from '../logger';
import { ApiMetadata } from '../metadata/api';
import { EventRouteMetadata } from '../metadata/event';
import { HttpRouteMetadata } from '../metadata/http';
import { Metadata } from '../metadata/registry';
import { ServiceMetadata } from '../metadata/service';
import { GraphKind } from '../metadata/type';
import { Configuration } from '../types/config';
import { Class, ContainerState, Context, CoreContainer, ProcessInfo, ServiceInfo } from '../types/core';
import { EventRequest, EventResult } from '../types/event';
import { GraphQL, GraphRequest } from '../types/graphql';
import { HttpRequest, HttpResponse } from '../types/http';
import { RemoteRequest } from '../types/proxy';
import { Security } from '../types/security';
import { Utils } from '../utils';
import { CoreConfiguration } from './config';
import { Core } from './core';
import { CoreGraphQL } from './graphql';
import { HttpUtils } from './http';
import { CoreSecurity } from './security';

export class CoreInstance implements CoreContainer {

  public application: string;
  public name: string;
  public log: Logger;

  private container: Di.ContainerInstance;
  private config: Configuration;
  private security: Security;
  private istate: ContainerState;

  private services: object[] = [];

  constructor(application: string, name: string, index?: number) {
    this.application = application;
    this.name = name || CoreInstance.name;
    if (index !== undefined) this.name += ':' + index;

    this.container = Di.Container.of(this.name);
    this.container.set(CoreContainer, this);

    this.log = Logger.get(this.application, this.name);
    this.istate = ContainerState.Pending;
  }

  public initialize(): this {
    if (this.istate !== ContainerState.Pending) throw new InternalServerError("Invalid container state");

    if (!Di.Container.has(Configuration)) {
      this.log.info('Using core configuration service');
      this.container.set({ id: Configuration, type: CoreConfiguration });
    }
    this.config = this.container.get(Configuration);
    if (this.config instanceof CoreConfiguration) {
      this.config.init(this.application);
    } else if (!ServiceMetadata.has(this.config)) {
      throw new TypeError(`Configuration must be a service`);
    }

    if (!Di.Container.has(Security)) {
      this.log.info('Using core security service');
      this.container.set({ id: Security, type: CoreSecurity });
    }
    this.security = this.container.get(Security);
    if (this.security instanceof CoreSecurity) {
      // OK
    } else if (!ServiceMetadata.has(this.security)) {
      throw new TypeError(`Security must be a service`);
    }

    if (!Di.Container.has(GraphQL)) {
      this.log.info('Using core GraphQL service');
      // TODO: CoreGraphQL.finalize()
      this.container.set({ id: GraphQL, type: CoreGraphQL });
    }

    // Prioritize services with initializer
    for (const service of Object.values(Metadata.Service)) {
      if (!service.final || !service.initializer) continue;
      this.log.info('Initialize [%s]', service.name);
      this.container.set({ id: service.target, type: service.target });
      const inst = this.get(service.target);
      // TODO: Avoid double set
      this.container.set({ id: service.alias, type: service.target, value: inst });
      inst[service.initializer.method]();
    }

    // Create private Api instances
    for (const api of Object.values(Metadata.Api)) {
      if (api.owner || !api.service) continue;
      const local = api.local(this);
      // TODO: Recoursive set for inherited api
      if (local) this.container.set(api.target, local);
    }

    this.istate = ContainerState.Ready;
    return this;
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

  public has<T = any>(id: Class | ApiMetadata | ServiceMetadata | string): boolean {
    if (typeof id === 'string') return this.container.has(id);
    if (id instanceof ApiMetadata) return !!id.service && this.has(id.service);
    if (id instanceof ServiceMetadata) return this.container.has(id.inline ? id.alias : id.target as any);
    return this.container.has(id);
  }

  public get<T = any>(id: Class | ApiMetadata | ServiceMetadata | string): T {
    if (typeof id === 'string') return this.container.get(id);
    if (id instanceof ApiMetadata) return id.service && this.get(id.service);
    if (id instanceof ServiceMetadata) return this.container.get(id.inline ? id.alias : id.target as any);
    return this.container.get<T>(id);
  }

  public serviceInfo(core?: boolean): ServiceInfo[] {
    if (core) return Core.serviceInfo();
    const services = [...(this.container as any).services];
    // const glob: any = Container.of(undefined);
    // glob.services.forEach((g: any) => {
    //   const x = services.find(i => i.id === g.id) || g;
    //   // x.global = true;
    //   if (x === g) services.push(x);
    // });
    return services;
  }

  public processInfo(): ProcessInfo {
    return Core.processInfo();
  }

  // Used is CoreInfoSchema
  protected instances(): CoreInstance[] {
    return (Core as any).pool;
  }

  // --------------------------------------------------

  // TODO: Why just wrapper for graph request?
  public async resolve(
    method: MethodInfo,
    obj: any,
    input: ResolverQuery & ResolverArgs,
    // TODO: Why new context is generated?
    ctx?: ResolverContext,
    // TODO: Why not passed to methods
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
      true
    );
  }

  // TODO: Execute within same container
  public async apiRequest(apiType: string, apiMethod: string, ...args: any[]): Promise<any> {
    // throw new Error(`Not implemented. Called [${meta.api.name}.${meta.name}]`);
    if (this.istate !== ContainerState.Reserved) throw new InternalServerError('Invalid container state');
    try {
      // this.log.debug('API Request [] %j', req);
      const api = Metadata.Api[apiType];
      if (!api) throw this.log.error(new Forbidden(`Service not found ${apiType}`));
      const method = api.methods[apiMethod];
      if (!method) throw this.log.error(new Forbidden(`Method not found [${api.name}.${apiMethod}]`));

      this.istate = ContainerState.Busy;
      const ctx = await this.security.apiAuth(this, method, args[0]);

      let log = this.log;
      const startTime = log.time();
      try {
        const service = this.get(api);
        if (!service) throw new InternalServerError(`Service not resolved [${apiType}]`);
        log = Logger.get(service);
        await this.activate(ctx);
        const handler: Function = service[method.name];
        // if (handler === apiMethod) throw new NotImplemented(`Method not implemented [${api.name}.${method.name}]`);
        const result = await handler.apply(service, args);
        return result;
      } catch (e) {
        throw this.log.error(e);
      } finally {
        log.timeEnd(startTime, `${method.name}`);
        await this.release(ctx);
      }
    } finally {
      this.istate = ContainerState.Ready;
    }
  }

  public async httpRequest(req: HttpRequest): Promise<HttpResponse> {
    if (this.istate !== ContainerState.Reserved) throw new InternalServerError('Invalid container state');
    try {
      req.type = 'http';
      this.log.debug('HTTP Event: %j', req);

      HttpUtils.request(req);

      const route = HttpRouteMetadata.route(req.httpMethod, req.resource, req.contentType.domainModel);
      const target = Metadata.HttpRoute[route];
      if (!target) throw this.log.error(new Forbidden(`Route not found [${route}]`));
      if (!target.method.roles) throw this.log.error(new Forbidden(`Method [${target.api.name}.${target.method.name}] not available`));

      req.application = this.application;
      req.service = target.api.name;
      req.method = target.method.name;

      this.istate = ContainerState.Busy;
      const ctx = await this.security.httpAuth(this, target.method, req);

      let log = this.log;
      const startTime = log.time();
      try {
        const service = this.get(target.service);
        if (!service) throw new InternalServerError(`Service not resolved [${req.service}]`);
        log = Logger.get(service);

        await this.activate(ctx);

        this.log.debug('HTTP Context: %j', ctx);
        this.log.debug('HTTP Request: %j', req);

        const handler: Function = service[target.method.name];
        const args: any = [];
        if (target.method.bindings) {
          for (const [index, arg] of target.method.bindings.entries()) {
            args[index] = (arg.binder ? arg.binder(ctx, req) : undefined);
          }
        }
        let result = await handler.apply(service, args);
        const contentType = target.method.contentType || 'application/json';
        if (contentType !== HttpResponse) result = { statusCode: target.code, body: result, contentType };

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
        log.timeEnd(startTime, `${target.method.name}`);
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

      if (req.application !== this.application) throw this.log.error(new Forbidden(`Application not found [${req.application}]`));
      const api = Metadata.Api[req.service];
      if (!api) throw this.log.error(new Forbidden(`Api not found [${req.service}]`));
      // if (!this.container.has(req.service)) throw this.log.error(new InternalServerError(`Service not found [${req.service}]`));
      const method = api.methods[req.method];
      if (!method) throw this.log.error(new Forbidden(`Method [${req.service}.${req.method}] not found `));
      if (!method.roles) throw this.log.error(new Forbidden(`Method [${req.service}.${req.method}] not available`));

      this.istate = ContainerState.Busy;
      const ctx = await this.security.graphAuth(this, method, req);

      let log = this.log;
      const startTime = log.time();
      try {
        const service = this.get(api);
        if (!service) throw new InternalServerError(`Service not resolved [${req.service}]`);
        log = Logger.get(service);

        await this.activate(ctx);
        const handler: Function = service[method.name];
        let result: any;
        if (method.resolver) {
          result = await handler.call(service, req.obj, req.args, ctx, req.info);
        } else if (method.input.kind === GraphKind.Void) {
          result = await handler.call(service, ctx);
        } else {
          result = await handler.call(service, req.args, ctx);
        }
        return result;
      } catch (e) {
        throw this.log.error(e);
      } finally {
        log.timeEnd(startTime, `${method.name}`);
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

      if (req.application !== this.application) throw this.log.error(new Forbidden(`Application not found [${req.application}]`));
      const api = Metadata.Api[req.service];
      if (!api) throw this.log.error(new Forbidden(`Service not found [${req.service}]`));
      // if (!this.container.has(req.service)) throw this.log.error(new InternalServerError(`Service not found [${req.service}]`));
      const method = api.methods[req.method];
      if (!method) throw this.log.error(new Forbidden(`Method not found [${api.services}.${req.method}]`));
      if (!method.roles) throw this.log.error(new Forbidden(`Method not available`));

      this.istate = ContainerState.Busy;
      const ctx = await this.security.remoteAuth(this, method, req);

      let log = this.log;
      const startTime = log.time();
      try {
        const service = this.get(api);
        if (!service) throw new InternalServerError(`Service not resolved [${req.service}]`);
        log = Logger.get(service);
        await this.activate(ctx);
        const handler: Function = service[method.name];
        const result = await handler.call(service, ...req.args);
        return result;
      } catch (e) {
        throw this.log.error(e);
      } finally {
        log.timeEnd(startTime, `${method.name}`);
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
      let targets = Metadata.EventRoute[route];
      if (!targets) {
        route = EventRouteMetadata.route(req.source, alias);
        targets = Metadata.EventRoute[route];
      }
      if (!targets) throw this.log.error(new Forbidden(`Event handler not found [${route}] [${req.object}]`));

      const result: EventResult = {
        status: null,
        source: req.source,
        action: req.action,
        resource: req.resource,
        object: req.object,
        returns: [],
      };

      this.istate = ContainerState.Busy;
      for (const target of targets) {
        if (!Utils.wildcardMatch(target.actionFilter, req.action)
          || !Utils.wildcardMatch(target.objectFilter, req.object)) continue;

        req.application = this.application;
        req.service = target.api.name;
        req.method = target.method.name;

        const ctx = await this.security.eventAuth(this, target.method, req);

        let log = this.log;
        const startTime = log.time();
        try {
          const service = this.get(target.api);
          if (!service) throw new InternalServerError(`Service not resolved [${req.service}]`);
          log = Logger.get(service);

          await this.activate(ctx);
          for (const record of req.records) {
            req.record = record;
            const handler = service[target.method.name];
            const data = await handler.call(service, ctx, req);
            result.status = result.status || 'OK';
            result.returns.push({
              service: target.api.name,
              method: target.method.name,
              error: null,
              data,
            });
          }
        } catch (e) {
          this.log.error(e);
          result.status = 'FAILED';
          result.returns.push({
            service: target.api.name,
            method: target.method.name,
            error: InternalServerError.wrap(e),
            data: null,
          });
        } finally {
          log.timeEnd(startTime, `${target.method.name}`);
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
    const services: ServiceInfo[] = (this.container as any).services;
    for (let i = 0; i < services.length; i++) {
      const service = services[i];
      if (!service || !service.value) continue;
      const meta = ServiceMetadata.get(service.type || service.value);
      if (!meta || !meta.activator) continue;
      try {
        // TODO: Optimeze with map ...
        if (this.services.includes(service.value)) continue;
        const handler = service.value[meta.activator.method] as Function;
        await handler.call(service.value, ctx);
        this.services.push(service.value);
      } catch (e) {
        this.log.error('Failed to activate service: [%s]', meta.name);
        this.log.error(e);
        throw e;
        // TODO: Error state for container
      }
    }
    return ctx;
  }

  public async release(ctx: Context): Promise<void> {
    const services: ServiceInfo[] = (this.container as any).services;
    for (let i = 0; i < services.length; i++) {
      const service = services[services.length - i - 1];
      if (!service || !service.value) continue;
      const meta = ServiceMetadata.get(service.type || service.value);
      if (!meta || !meta.releasor) continue;
      try {
        const handler = service.value[meta.releasor.method] as Function;
        await handler.call(service.value, ctx);
      } catch (e) {
        this.log.error('Failed to release service: [%s]', meta.name);
        this.log.error(e);
        // TODO: Error state for container
      }
    }
    this.services = [];
  }
}
