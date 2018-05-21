import { ProxyMetadata } from "../metadata";
import { Service } from "./service";

export interface Proxy extends Service {
}

export function Proxy(service?: string, application?: string, functionName?: string): ClassDecorator {
    return (target) => {
        service = service || target.name.replace("Proxy", "");
        let meta = ProxyMetadata.define(target, service);
        meta.application = application;
        meta.functionName = functionName || (meta.name + "-function");
    };
}
