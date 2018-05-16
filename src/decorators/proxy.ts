import { ProxyMetadata } from "../metadata";
import { Service } from "./service";

export interface Proxy extends Service {
}

export function Proxy(service: string, application?: string, functionName?: string) {
    return function (type: Function) {
        functionName = functionName || (service + "-function");
        let meta = ProxyMetadata.get(type);
        meta.name = service;
        meta.application = application;
        meta.functionName = functionName;
        meta.proxy = service;
    };
}


