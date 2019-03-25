import { Class } from '../types/core';
import { ApiMetadata, IApiMetadata } from './api';
import { IMethodMetadata, MethodMetadata } from './method';
import { IServiceMetadata, ServiceMetadata } from './service';

export interface IEventRouteMetadata {
  target: Class;
  api: IApiMetadata;
  method: IMethodMetadata;
  base: IEventRouteMetadata;
  over: IEventRouteMetadata;
  servicer: IServiceMetadata;

  route: string;
  source: string;
  resource: string;
  objectFilter: string;
  actionFilter: string;
}

export class EventRouteMetadata implements IEventRouteMetadata {
  public target: Class;
  public api: ApiMetadata;
  public method: MethodMetadata;
  public base: EventRouteMetadata;
  public over: EventRouteMetadata;
  public servicer: ServiceMetadata;

  public route: string;
  public source: string;
  public resource: string;
  public objectFilter: string;
  public actionFilter: string;

  public static route(source: string, resource: string) {
    return `${source}/${resource}`;
  }

  constructor(literal: Partial<IEventRouteMetadata>) {
    Object.assign(this, literal);
  }

  public inherit(method: MethodMetadata): this {
    const copy = { ...this };
    Object.setPrototypeOf(copy, EventRouteMetadata.prototype);
    copy.base = this;
    copy.api = undefined;
    copy.method = method;
    copy.target = method.target;
    return copy;
  }

  public override(over: EventRouteMetadata): this {
    if (!over) return this;
    this.over = over;
    this.route = this.route || over.route;
    this.source = this.source || over.source;
    this.objectFilter = this.objectFilter || over.objectFilter;
    this.actionFilter = this.actionFilter || over.actionFilter;
    return this;
  }
}
