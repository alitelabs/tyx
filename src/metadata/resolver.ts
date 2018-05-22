import { Roles } from "../types";
import { AuthMetadata } from "./auth";

export interface ResolverMetadata extends AuthMetadata {
    input: GraphTypeMetadata;
    result: GraphTypeMetadata;
}

export interface GraphTypeMetadata {
    type: string;
    // name: string;
    constructor: Function;
}

export namespace ResolverMetadata {
    export function has(target: Object, propertyKey: string): boolean {
        return !!get(target, propertyKey);
    }

    export function get(target: Object, propertyKey: string): ResolverMetadata {
        let meta = AuthMetadata.get(target, propertyKey) as ResolverMetadata;
        return meta && meta.roles && meta.input && meta.result && meta;
    }

    export function define(target: Object, propertyKey: string, descriptor: PropertyDescriptor,
        oper: string, roles: Roles, input?: Function, result?: Function): ResolverMetadata {
        let meta = AuthMetadata.define(target, propertyKey, descriptor, oper, roles) as ResolverMetadata;
        meta.input = input ? { type: input.name, constructor: input } : { type: "Object", constructor: null };
        meta.result = result ? { type: result.name, constructor: input } : { type: "Object", constructor: null };
        return meta;
    }
}