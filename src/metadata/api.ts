import { GraphType } from "../types";
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

    export function init(target: Function): ApiMetadata {
        let meta = get(target);
        if (!meta) {
            meta = Metadata.define(target) as ApiMetadata;
            meta.authMetadata = {};
            meta.inputMetadata = {};
            meta.resultMetadata = {};
            meta.resolverMetadata = {};
            meta.httpMetadata = {};
            meta.eventMetadata = {};
            Reflect.defineMetadata(META_TYX_API, meta, target);
        }
        return meta;
    }

    export function define(target: Function, name?: string): ApiMetadata {
        let meta = init(target);
        if (name) meta.name = meta.api = name;
        if (!meta.api) meta.name = meta.api = target.name;

        Object.values(meta.authMetadata).forEach(item => item.api = meta.api);
        Object.values(meta.resolverMetadata).forEach(item => item.api = meta.api);
        Object.values(meta.httpMetadata).forEach(item => item.api = meta.api);
        Object.values(meta.eventMetadata).forEach(item => item.forEach(h => h.api = meta.api));
        Object.values(meta.inputMetadata).forEach(item => item.api = meta.api);
        Object.values(meta.resultMetadata).forEach(item => item.api = meta.api);

        schema(target);

        return meta;
    }

    export function schema(target: Function | Object): string {
        let api = get(target);
        for (let res of Object.values(api.resolverMetadata)) {
            // res.input = resolveInput(api, res.input);
            // res.result = resolveInput(api, res.result);
        }
        return "# " + api.name;
    }

    export function resolveInput(api: ApiMetadata, meta: GraphMetadata): GraphMetadata {
        if (GraphType.isScalar(meta.type)) {
            meta.schema = meta.type;
            return meta;
        }
        if (meta.name && api.inputMetadata[meta.name]) {
            return api.inputMetadata[meta.name];
        }
        if (GraphType.isRef(meta.type)) {
            let ref = GraphMetadata.get(meta.target);
            if (ref) {
                meta.schema = ref.name;
                resolveInput(api, ref);
            } else {
                meta.schema = GraphType.Object;
            }
            return meta;
        }
        if (GraphType.isEntity(meta.type)) {
            // TODO: Register imports
            meta.schema = meta.name;
            return meta;
        }
        if (!GraphType.isInput(meta.type))
            throw new TypeError(`Input type can not reference [${meta.type}]`);

        // Generate Input schema
        api.inputMetadata[meta.name] = meta;
        let def = `input ${meta.name} {\n`;
        for (let [name, field] of Object.entries(meta.fields)) {
            def += `  ${name}: ${field.type}\n`;
        }
        def += "}";
        meta.schema = def;
        return meta;
    }
}