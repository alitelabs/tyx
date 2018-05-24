import { GraphType, Roles } from "../types";
import { ApiMetadata } from "./api";
import { AuthMetadata } from "./auth";
import { GraphMetadata } from "./graphql";

export interface ResolverMetadata extends AuthMetadata {
    input: GraphMetadata;
    result: GraphMetadata;
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
        meta.input = input ? { type: GraphType.Ref, name: input.name, target: input } : { type: GraphType.ANY };
        meta.result = result ? { type: GraphType.Ref, name: result.name, target: result } : { type: GraphType.ANY };
        let api = ApiMetadata.init(target.constructor);
        api.resolverMetadata[propertyKey] = meta;
        return meta;
    }
}