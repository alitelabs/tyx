import { ProcessInfo, ProcessInfoQuery, Utils } from 'exer';
import { DocumentNode } from 'graphql';
import { Forbidden, InternalServerError } from '../errors/http';
import { Di } from '../import';
import { Logger } from '../logger';
import { ApiMetadata } from '../metadata/api';
import { EventRouteMetadata } from '../metadata/event';
import { HttpRouteMetadata } from '../metadata/http';
import { Registry } from '../metadata/registry';
import { ServiceMetadata } from '../metadata/service';
import { Configuration } from '../types/config';
// tslint:disable-next-line:max-line-length
import { Class, ContainerState, Context, CoreContainer, ResolverArgs, ResolverInfo, ResolverQuery, ServiceInfo } from '../types/core';
import { EventRequest, EventResult, PingRequest } from '../types/event';
import { GraphQL } from '../types/graphql';
import { HttpRequest, HttpResponse } from '../types/http';
import { RemoteRequest } from '../types/proxy';
import { Security } from '../types/security';
import { Thrift } from '../types/thrift';
import { CoreConfiguration } from './config';
import { Core } from './core';
import { CoreGraphQL } from './graphql';
import { HttpUtils } from './http';
import { CoreSecurity } from './security';
import { CoreThrift } from './thrift';

export class CoreInstance implements CoreContainer {

  public application: string;
  public name: string;
  public log: Logger;

  protected container: Di.ContainerInstance;
  protected config: Configuration;
  protected security: Security;
  protected graphql: GraphQL;
  protected thrift: Thrift;

  private active: ServiceInfo[];
  private istate: ContainerState;
  private context: Context;

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

    // TODO: Why config and security are .get() before graph and thrift??
    if (!Di.Container.has(Configuration)) {
      this.log.debug('Using core Configuration service');
      this.container.set({ id: Configuration, type: CoreConfiguration });
    }
    this.config = this.container.get(Configuration);
    if (this.config instanceof CoreConfiguration) {
      this.config.init(this.application);
    } else if (!ServiceMetadata.has(this.config)) {
      throw new TypeError(`Configuration must be a service`);
    }

    if (!Di.Container.has(Security)) {
      this.log.debug('Using core Security service');
      this.container.set({ id: Security, type: CoreSecurity });
    }
    this.security = this.container.get(Security);
    if (this.security instanceof CoreSecurity) {
      // OK
    } else if (!ServiceMetadata.has(this.security)) {
      throw new TypeError(`Security must be a service`);
    }

    if (!Di.Container.has(GraphQL)) {
      this.log.debug('Using core GraphQL service');
      CoreGraphQL.finalize();
      this.container.set({ id: GraphQL, type: CoreGraphQL });
    }

    if (!Di.Container.has(Thrift)) {
      this.log.debug('Using core Thrift service');
      CoreThrift.finalize();
      this.container.set({ id: Thrift, type: CoreThrift });
    }

    // Prioritize services with initializer
    for (const service of Object.values(Registry.ServiceMetadata)) {
      if (!service.final || !service.initializer) continue;
      this.log.info('Initialize [%s]', service.name);
      this.container.set({ id: service.target, type: service.target });
      const inst = this.get(service.target);
      // TODO: Avoid triple set
      this.container.set({ id: service.alias, type: service.target, value: inst });
      if (service.name !== service.alias) {
        this.container.set({ id: service.name, type: service.target, value: inst });
      }
      inst[service.initializer.method]();
    }

    this.graphql = this.get(GraphQL);
    this.thrift = this.get(Thrift);

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
    if (id instanceof ApiMetadata) return !!id.servicer && this.has(id.servicer);
    if (id instanceof ServiceMetadata) return this.container.has(id.inline ? id.alias : id.target as any);
    return this.container.has(id);
  }

  public get<T = any>(id: Class | ApiMetadata | ServiceMetadata | string): T {
    if (typeof id === 'string') return this.container.get(id);
    if (id instanceof ApiMetadata) return id.servicer && this.get(id.servicer);
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
  public instances(): CoreInstance[] {
    return Core.poolInfo();
  }

  // --------------------------------------------------

  public metadata(): Registry {
    return Registry as any;
  }

  public async execute(ctx: Context, source: string, variables?: Record<string, any>): Promise<any>;
  public async execute(ctx: Context, document: DocumentNode, variables?: Record<string, any>): Promise<any>;
  public async execute(ctx: Context, oper: DocumentNode | string, variables?: Record<string, any>): Promise<any> {
    const data = await this.graphql.execute(ctx, oper as any, variables);
    return data.result || data;
  }

  public async ping(req: PingRequest): Promise<ProcessInfo> {
    const ctx = await this.security.eventAuth(this, CoreGraphQL.process, req);
    const data = await this.graphql.execute(ctx, ProcessInfoQuery);
    this.log.debug('PING: %j', data);
    return data.Core.Process;
  }

  public async invoke(apiType: string, apiMethod: string, ...args: any[]): Promise<any> {
    if (this.istate !== ContainerState.Reserved) throw new InternalServerError('Invalid container state');
    let log = this.log;
    try {
      // log.debug('API Request [] %j', req);
      const api = Registry.ApiMetadata[apiType];
      if (!api) throw new Forbidden(`Service not found ${apiType}`);
      const method = api.methods[apiMethod];
      if (!method) throw new Forbidden(`Method not found [${api.name}.${apiMethod}]`);

      this.istate = ContainerState.Busy;
      const ctx = await this.security.apiAuth(this, method, this.context);

      log = Logger.get(api.servicer);
      const startTime = log.time();
      const service = this.get(api.servicer);
      if (!service) throw new InternalServerError(`Service not resolved [${apiType}]`);
      await this.activate(ctx);
      try {
        const handler: Function = service[method.name];
        // if (handler === apiMethod) throw new NotImplemented(`Method not implemented [${api.name}.${method.name}]`);
        const result = await handler.apply(service, args);
        return result;
      } finally {
        log.timeEnd(startTime, `${method.name}`);
        await this.release(ctx);
      }
    } catch (err) {
      log.error(err);
      throw err;
    } finally {
      this.istate = ContainerState.Ready;
    }
  }

  public async resolve(
    memberId: string,
    obj: any,
    args: ResolverQuery & ResolverArgs,
    ctx: Context,
    // TODO: Why not passed to methods
    info?: ResolverInfo
  ): Promise<any> {
    const [target, member] = memberId.split('.');
    const reqq = {
      type: 'graphql',
      requestId: ctx.requestId,
      sourceIp: ctx.sourceIp,
      application: this.application,
      service: target,
      method: member,
      args
    };

    if (this.istate !== ContainerState.Reserved) throw new InternalServerError('Invalid container state');
    let log = this.log;
    try {
      log.debug('GraphQL Request: %j', reqq);

      const api = Registry.ApiMetadata[target];
      if (!api) throw new Forbidden(`Api not found [${target}]`);
      const method = api.methods[member];
      if (!method) throw new Forbidden(`Method [${memberId}] not found `);
      if (!method.roles) throw new Forbidden(`Method [${memberId}] not available`);

      this.istate = ContainerState.Busy;
      // tslint:disable-next-line:no-parameter-reassignment
      ctx = await this.security.graphAuth(this, method, ctx);

      log = Logger.get(api.servicer);
      const startTime = log.time();
      const service = this.get(api.servicer);
      if (!service) throw new InternalServerError(`Service not resolved [${service}]`);
      await this.activate(ctx);
      try {
        const handler: Function = service[method.name];
        const argv = method.resolve(obj, args, ctx, info);
        const result = await handler.call(service, ...argv);
        return result;
      } finally {
        log.timeEnd(startTime, `${method.name}`);
        await this.release(ctx);
      }
    } catch (err) {
      log.error(err);
      throw err;
    } finally {
      this.istate = ContainerState.Ready;
    }
  }

  public async httpRequest(req: HttpRequest): Promise<HttpResponse> {
    if (this.istate !== ContainerState.Reserved) throw new InternalServerError('Invalid container state');
    let log = this.log;
    try {
      req.type = 'http';
      log.debug('HTTP Event: %j', req);

      HttpUtils.request(req);

      const route = HttpRouteMetadata.route(req.httpMethod, req.resource, req.contentType.domainModel);
      const target = Registry.HttpRouteMetadata[route];
      if (!target) throw new Forbidden(`Route not found [${route}]`);
      if (!target.method.roles) throw new Forbidden(`Method [${target.api.name}.${target.method.name}] not available`);

      req.service = target.api.name;
      req.method = target.method.name;

      this.istate = ContainerState.Busy;
      const ctx = await this.security.httpAuth(this, target.method, req);

      log = Logger.get(target.servicer);
      const service = this.get(target.servicer);
      const startTime = log.time();
      if (!service) throw new InternalServerError(`Service not resolved [${req.service}]`);
      await this.activate(ctx);
      try {
        log.debug('HTTP Context: %j', ctx);
        log.debug('HTTP Request: %j', req);

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
        log.debug('Response: %j', result);
        return result;
      } finally {
        log.timeEnd(startTime, `${target.method.name}`);
        await this.release(ctx);
      }
    } catch (err) {
      log.error(err);
      throw InternalServerError.wrap(err);
    } finally {
      this.istate = ContainerState.Ready;
    }
  }

  public async remoteRequest(req: RemoteRequest): Promise<any> {
    if (this.istate !== ContainerState.Reserved) throw new InternalServerError('Invalid container state');
    let log = this.log;
    try {
      log.debug('Remote Request: %j', req);

      if (req.application !== this.application) throw new Forbidden(`Application not found [${req.application}]`);
      const api = Registry.ApiMetadata[req.service];
      if (!api) throw new Forbidden(`Service not found [${req.service}]`);
      // if (!this.container.has(req.service)) throw new InternalServerError(`Service not found [${req.service}]`));
      const method = api.methods[req.method];
      if (!method) throw new Forbidden(`Method not found [${api.services}.${req.method}]`);
      if (!method.roles) throw new Forbidden(`Method not available`);

      this.istate = ContainerState.Busy;
      const ctx = await this.security.remoteAuth(this, method, req);

      log = Logger.get(api.servicer);
      const startTime = log.time();
      const service = this.get(api.servicer);
      if (!service) throw new InternalServerError(`Service not resolved [${req.service}]`);
      await this.activate(ctx);
      try {
        const handler: Function = service[method.name];
        const result = await handler.call(service, ...req.args);
        return result;
      } finally {
        log.timeEnd(startTime, `${method.name}`);
        await this.release(ctx);
      }
    } catch (err) {
      log.error(err);
      throw err;
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
      let targets = Registry.EventRouteMetadata[route];
      if (!targets) {
        route = EventRouteMetadata.route(req.source, alias);
        targets = Registry.EventRouteMetadata[route];
      }
      if (!targets) new Forbidden(`Event handler not found [${route}] [${req.object}]`);

      const result: EventResult = {
        status: null,
        source: req.source,
        action: req.action,
        resource: req.resource,
        object: req.object,
        returns: [],
      };

      let log = this.log;
      this.istate = ContainerState.Busy;
      for (const target of targets) {
        if (!Utils.wildcardMatch(target.actionFilter, req.action)
          || !Utils.wildcardMatch(target.objectFilter, req.object)) continue;

        req.service = target.api.name;
        req.method = target.method.name;

        const ctx = await this.security.eventAuth(this, target.method, req);

        log = Logger.get(target.servicer);
        const startTime = log.time();
        const service = this.get(target.servicer);
        if (!service) throw new InternalServerError(`Service not resolved [${req.service}]`);
        await this.activate(ctx);
        try {
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
          log.error(e);
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
    } catch (err) {
      this.log.error(err);
      throw err;
    } finally {
      this.istate = ContainerState.Ready;
    }
  }

  public async activate(ctx: Context): Promise<Context> {
    // TODO: Error message
    if (this.context && this.context !== ctx) throw new InternalServerError('Invalid container state, context bound');
    this.context = ctx;
    const active = this.active = this.active || [];
    const services: ServiceInfo[] = (this.container as any).services;
    for (let i = 0; i < services.length; i++) {
      const service = services[i];
      if (!service || !service.value) continue;
      const meta = ServiceMetadata.get(service.type || service.value);
      if (!meta || !meta.activator) continue;
      // Avoid double activation of the same value under different ids
      if (active.includes(service.value)) continue;
      active.push(service.value);
      try {
        const handler = service.value[meta.activator.method] as Function;
        await handler.call(service.value, ctx);
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
    // TODO: Error message
    if (this.context !== ctx) throw new InternalServerError('Invalid container state, no context');
    const done: any[] = [];
    const services: ServiceInfo[] = (this.container as any).services;
    for (let i = 0; i < services.length; i++) {
      const service = services[services.length - i - 1];
      if (!service || !service.value) continue;
      const meta = ServiceMetadata.get(service.type || service.value);
      if (!meta || !meta.releasor) continue;
      // Avoid double release of the same value under different ids
      if (done.includes(service)) continue;
      done.push(service);
      try {
        const handler = service.value[meta.releasor.method] as Function;
        await handler.call(service.value, ctx);
      } catch (e) {
        this.log.error('Failed to release service: [%s]', meta.name);
        this.log.error(e);
        // TODO: Error state for container
      }
    }
    this.active = [];
    this.context = undefined;
  }
}
