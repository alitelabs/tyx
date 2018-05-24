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
            res.input = resolve(api, res.input, true);
            res.result = resolve(api, res.result, false);
        }
        return "# " + api.name;
    }

    export function resolve(api: ApiMetadata, meta: GraphMetadata, input: boolean): GraphMetadata {
        if (GraphType.isScalar(meta.type)) {
            meta.ref = meta.type;
            return meta;
        }
        if (meta.target && input && api.inputMetadata[meta.target.name]) {
            return api.inputMetadata[meta.target.name];
        }
        if (meta.target && !input && api.resultMetadata[meta.target.name]) {
            return api.resultMetadata[meta.target.name];
        }
        if (GraphType.isRef(meta.type)) {
            let type = GraphMetadata.get(meta.target);
            if (type) {
                type = resolve(api, type, input);
                meta.ref = type.ref;
            } else {
                meta.ref = GraphType.Object;
            }
            return meta;
        }
        if (GraphType.isList(meta.type)) {
            let type = resolve(api, meta.item, input);
            if (type) {
                meta.ref = `[${type.ref}]`;
            } else {
                meta.ref = `[${GraphType.Object}]`;
            }
            return meta;
        }
        if (GraphType.isEntity(meta.type) && !input) {
            // TODO: Register imports
            meta.ref = meta.target.name;
            return meta;
        }
        if (input && !GraphType.isInput(meta.type))
            throw new TypeError(`Input type can not reference [${meta.type}]`);

        if (!input && GraphType.isInput(meta.type))
            throw new TypeError(`Result type can not reference [${meta.type}]`);

        if (!meta.fields)
            throw new TypeError(`Empty type difinition ${meta.target}`);

        // Generate schema
        meta.ref = meta.target.name;
        if (input) api.inputMetadata[meta.ref] = meta; else api.resultMetadata[meta.ref] = meta;
        let def = input ? `input ${meta.ref} {\n` : `type ${meta.ref} {\n`;
        for (let [key, field] of Object.entries(meta.fields)) {
            let res = resolve(api, field, input);
            def += `  ${key}: ${res.ref}\n`;
        }
        def += "}";
        meta._schema = def;
        return meta;
    }
}