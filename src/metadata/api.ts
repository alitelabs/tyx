import { AuthMetadata } from "./auth";
import { META_TYX_API, Metadata } from "./common";
import { EventMetadata } from "./event";
import { GraphMetadata } from "./graphql";
import { HttpMetadata } from "./http";
import { ResolverMetadata } from "./resolver";

export interface ApiMetadata extends Metadata {
    api: string;

    authMetadata: Record<string, AuthMetadata>;
    inputMetadata: Record<string, GraphMetadata>;
    resultMetadata: Record<string, GraphMetadata>;
    resolverMetadata: Record<string, ResolverMetadata>;
    httpMetadata: Record<string, HttpMetadata>;
    eventMetadata: Record<string, EventMetadata[]>;
}

export namespace ApiMetadata {
    export function has(target: Function | Object): boolean {
        return Reflect.hasMetadata(META_TYX_API, target)
            || Reflect.hasMetadata(META_TYX_API, target.constructor);
    }

    export function get(target: Function | Object): ApiMetadata {
        return Reflect.getMetadata(META_TYX_API, target)
            || Reflect.getMetadata(META_TYX_API, target.constructor);
    }

    export function define(target: Function, name?: string): ApiMetadata {
        let meta = get(target);
        if (!meta) {
            meta = Metadata.define(target, name) as ApiMetadata;
            meta.authMetadata = {};
            meta.inputMetadata = {};
            meta.resultMetadata = {};
            meta.resolverMetadata = {};
            meta.httpMetadata = {};
            meta.eventMetadata = {};
            Reflect.defineMetadata(META_TYX_API, meta, target);
        }
        if (name) meta.name = meta.api = name;
        if (!meta.api) meta.name = meta.api = target.name;
        return meta;
    }
}