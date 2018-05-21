import { ProxyMetadata } from "../metadata";
import { Service } from "./service";

export interface Proxy extends Service {
}

export function Proxy(service?: string, application?: string, functionName?: string): ClassDecorator {
    return (target) => {
        let meta = ProxyMetadata.get(target);
        meta.name = service || meta.name || target.name;
        meta.proxy = meta.name;
        meta.application = application;
        meta.functionName = functionName || (meta.name + "-function");
    };
}


