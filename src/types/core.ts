import { ResolverContainer } from "../graphql";
import { MethodMetadata } from "../metadata/method";
import { EventRequest, EventResult } from "./event";
import { HttpRequest, HttpResponse } from "./http";
import { RemoteRequest, RemoteResponse } from "./proxy";
import { AuthInfo } from "./security";

// export type _ObjectType<T> = {
//     new(): T;
// } | Function;

export type ObjectType<T> = { new(...args: any[]): T };

export type TypeRef<T> = (type?: any) => ObjectType<T>;

export interface Class extends Function { }

// export type Constructor<T = Object> = T & {
//     new(...args: any[]): T
// };

export interface Prototype extends Object { }

export class Context {
    public container: CoreContainer = undefined;
    public requestId: string;
    public sourceIp: string;
    public method: MethodMetadata;
    public auth: AuthInfo;
    constructor(ctx: Context) {
        Object.assign(this, ctx);
        Object.defineProperty(this, "container", { enumerable: false });
    }
}

export interface Request {
    type: "remote" | "internal" | "http" | "event" | "graphql";
    application: string;
    service: string;
    method: string;
    requestId: string;
}

export enum ContainerState {
    Pending = -1,
    Ready = 0,
    Reserved = 1,
    Busy = 2
}

export const CoreContainer = "container";

export interface CoreContainer extends ResolverContainer {
    state: ContainerState;

    httpRequest(req: HttpRequest): Promise<HttpResponse>;
    eventRequest(req: EventRequest): Promise<EventResult>;
    remoteRequest(req: RemoteRequest): Promise<RemoteResponse>;
}
