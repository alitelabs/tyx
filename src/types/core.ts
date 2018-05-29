import { MethodMetadata } from "../metadata";
import { EventRequest, EventResult } from "./event";
import { HttpRequest, HttpResponse } from "./http";
import { RemoteRequest, RemoteResponse } from "./proxy";
import { AuthInfo } from "./security";

export type ObjectType<T> = {
    new(): T;
} | Function;

export interface Class extends Function { }

// export type Constructor<T = Object> = T & {
//     new(...args: any[]): T
// };

export interface Prototype extends Object { }

export class Context {
    public container: CoreInstance = undefined;
    public requestId: string;
    public method: MethodMetadata;
    public auth: AuthInfo;
    constructor(ctx: IContext) {
        Object.assign(this, ctx);
        Object.defineProperty(this, "container", { enumerable: false });
    }
}
export interface IContext extends Context { }

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

export const CoreInstance = "container";

export interface CoreInstance {
    state: ContainerState;

    register(target: Class | Object): this;
    publish(service: Class): this;

    prepare(): Promise<CoreInstance>;

    httpRequest(req: HttpRequest): Promise<HttpResponse>;
    eventRequest(req: EventRequest): Promise<EventResult>;
    remoteRequest(req: RemoteRequest): Promise<RemoteResponse>;
}
