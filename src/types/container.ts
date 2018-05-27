import { Proxy, Service } from "../decorators";
import { ContainerMetadata } from "../metadata";
import { Context } from "./core";
import { EventRequest, EventResult } from "./event";
import { HttpRequest, HttpResponse } from "./http";
import { RemoteRequest, RemoteResponse } from "./proxy";

export interface HttpHandler {
    (ctx: Context, req: HttpRequest): Promise<HttpResponse>;
}

export interface RemoteHandler {
    (ctx: Context, req: RemoteRequest): Promise<any>;
}

export interface EventHandler {
    (ctx: Context, req: EventRequest): Promise<any>;
}

export enum ContainerState {
    Pending = -1,
    Ready = 0,
    Reserved = 1,
    Busy = 2
}

export const Container = "container";

export interface Container {
    state: ContainerState;
    metadata: ContainerMetadata;

    register(resource: Object, name?: string): this;
    register(service: Service): this;
    register(proxy: Proxy): this;
    register(type: Function, ...args: any[]): this;

    publish(service: Function, ...args: any[]): this;
    publish(service: Service): this;

    prepare(): Promise<Container>;

    httpRequest(req: HttpRequest): Promise<HttpResponse>;
    eventRequest(req: EventRequest): Promise<EventResult>;
    remoteRequest(req: RemoteRequest): Promise<RemoteResponse>;
}
