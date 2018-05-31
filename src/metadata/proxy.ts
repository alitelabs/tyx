import { Class, Prototype } from "../types/core";
import { Registry } from "./registry";
import { ServiceMetadata } from "./service";

export interface ProxyMetadata extends ServiceMetadata {
    application: string;
    functionName: string;
}

export class ProxyMetadata extends ServiceMetadata implements ProxyMetadata {
    public functionName: string;
    public application: string;

    protected constructor(target: Class) {
        super(target);
    }

    public static has(target: Class | Prototype): boolean {
        return Reflect.hasMetadata(Registry.TYX_PROXY, target)
            || Reflect.hasMetadata(Registry.TYX_PROXY, target.constructor);
    }

    public static get(target: Class | Prototype): ProxyMetadata {
        return Reflect.getMetadata(Registry.TYX_PROXY, target)
            || Reflect.getMetadata(Registry.TYX_PROXY, target.constructor);
    }

    public static define(target: Class): ProxyMetadata {
        let meta = this.get(target);
        if (!meta) {
            meta = ServiceMetadata.define(target) as any;
            Object.setPrototypeOf(meta, ProxyMetadata.prototype);
            Reflect.defineMetadata(Registry.TYX_PROXY, meta, target);
        }
        return meta;
    }

    public commit(service?: string, application?: string, functionName?: string): this {
        this.serviceId = service || this.target.name.replace("Proxy", "");
        this.functionName = functionName || (this.serviceId + "-function");
        this.application = application;
        super.commit(service);
        return this;
    }
}