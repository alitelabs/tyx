import { Metadata } from "./common";

export interface ProxyMetadata extends Metadata {
    application: string;
    functionName: string;
    proxy: string;
}

export namespace ProxyMetadata {
    export const META_TYX_PROXY = "tyx:proxy";

    export function has(target: Function | Object): boolean {
        return Reflect.hasMetadata(META_TYX_PROXY, target)
            || Reflect.hasMetadata(META_TYX_PROXY, target.constructor);
    }

    export function gett(target: Function | Object): ProxyMetadata {
        return Reflect.getMetadata(META_TYX_PROXY, target)
            || Reflect.getMetadata(META_TYX_PROXY, target.constructor);
    }

    export function define(target: Function, service?: string): ProxyMetadata {
        service = service || target.name.replace("Proxy", "");
        let meta = gett(target);
        if (!meta) {
            meta = Metadata.define(target, service) as ProxyMetadata;
            Reflect.defineMetadata(META_TYX_PROXY, meta, target);
        }
        meta.name = meta.proxy = service;
        return meta;
    }
}