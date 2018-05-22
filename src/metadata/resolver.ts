import { Roles } from "../types";
import { AuthMetadata } from "./auth";
import { MethodArgMetadata } from "./method";

export interface ResolverMetadata extends AuthMetadata {
    input: MethodArgMetadata;
    result: MethodArgMetadata;
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
        meta.input = input ? { type: input.name, constructor: input } : { type: "JSON", constructor: Object };
        meta.result = result ? { type: result.name, constructor: input } : { type: "JSON", constructor: Object };
        return meta;
    }
}