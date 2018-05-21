import { AuthMetadata } from "../metadata";
import { Container } from "./container";
import { AuthInfo } from "./security";

export type ObjectType<T> = {
    new(): T;
} | Function;

export type Constructor<T> = T & {
    new(): T
};

export class Context {
    public container: Container;
    public requestId: string;
    public metadata: AuthMetadata;
    public auth: AuthInfo;
    constructor(ctx: IContext) {
        Object.assign(this, ctx);
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