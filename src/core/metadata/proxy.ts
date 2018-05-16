import { Proxy } from "../decorators";
import { Metadata } from "./common";

export interface ProxyMetadata extends Metadata {
    application: string;
    functionName: string;
    proxy: string;
}

export namespace ProxyMetadata {
    export function has(target: Function | Object): target is Proxy {
        let meta = get(target, false);
        return !!(meta && meta.proxy);
    }
    export function get(target: Function | Object, init?: boolean): ProxyMetadata {
        return Metadata.get(target, init) as ProxyMetadata;
    }
    export function id(target: Function | Object, appId: string): string {
        return (application(target) || appId) + ":" + get(target).name;
    }
    export function application(target: Function | Object): string {
        return get(target).application;
    }
    export function service(target: Function | Object): string {
        return get(target).proxy;
    }
    export function functionName(target: Function | Object): string {
        return get(target).functionName;
    }
}