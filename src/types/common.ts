import { MethodMetadata } from "../metadata";
import { Container } from "./container";
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
    public container: Container;
    public requestId: string;
    public metadata: MethodMetadata;
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