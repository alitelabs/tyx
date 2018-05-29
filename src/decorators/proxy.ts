import { Registry } from "../metadata/registry";
import { ProxyMetadata } from "../metadata/proxy";
import { Service } from "./service";

export interface Proxy extends Service {
}

export function Proxy(service?: string, application?: string, functionName?: string): ClassDecorator {
    return (target) => {
        Registry.trace(Proxy, { service, application, functionName }, target);
        ProxyMetadata.define(target).commit(service, application, functionName);
    };
}