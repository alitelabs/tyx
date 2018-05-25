import { META_TYX_PROXY, Metadata } from "./common";
import { Service } from "./service";

export interface Proxy extends Service {
}

export function Proxy(service?: string, application?: string, functionName?: string): ClassDecorator {
    return (target) => {
        Metadata.trace(Proxy, target);
        service = service || target.name.replace("Proxy", "");
        let meta = ProxyMetadata.define(target, service);
        meta.application = application;
        meta.functionName = functionName || (meta.name + "-function");
    };
}

export interface ProxyMetadata extends Metadata {
    application: string;
    functionName: string;
    service: string;
}

export namespace ProxyMetadata {
    export function has(target: Function | Object): boolean {
        return Reflect.hasMetadata(META_TYX_PROXY, target)
            || Reflect.hasMetadata(META_TYX_PROXY, target.constructor);
    }

    export function get(target: Function | Object): ProxyMetadata {
        return Reflect.getMetadata(META_TYX_PROXY, target)
            || Reflect.getMetadata(META_TYX_PROXY, target.constructor);
    }

    export function define(target: Function, service?: string): ProxyMetadata {
        let meta = get(target);
        if (!meta) {
            meta = Metadata.init(target, service) as ProxyMetadata;
            Reflect.defineMetadata(META_TYX_PROXY, meta, target);
        }
        meta.name = meta.service = service;
        return meta;
    }
}