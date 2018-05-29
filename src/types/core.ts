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
    public container: Container = undefined;
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