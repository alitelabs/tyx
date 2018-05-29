import { Class, Context } from "./core";
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

    register(target: Class | Object): this;
    publish(service: Class): this;

    prepare(): Promise<Container>;

    httpRequest(req: HttpRequest): Promise<HttpResponse>;
    eventRequest(req: EventRequest): Promise<EventResult>;
    remoteRequest(req: RemoteRequest): Promise<RemoteResponse>;
}
