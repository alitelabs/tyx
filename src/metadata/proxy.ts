import { META_TYX_PROXY } from "./common";
import { ServiceMetadata } from "./service";

export interface ProxyMetadata extends ServiceMetadata {
    application: string;
    functionName: string;
}

export class ProxyMetadata extends ServiceMetadata implements ProxyMetadata {
    public functionName: string;
    public application: string;

    protected constructor(target: Function) {
        super(target);
    }

    public static has(target: Function | Object): boolean {
        return Reflect.hasMetadata(META_TYX_PROXY, target)
            || Reflect.hasMetadata(META_TYX_PROXY, target.constructor);
    }

    public static get(target: Function | Object): ProxyMetadata {
        return Reflect.getMetadata(META_TYX_PROXY, target)
            || Reflect.getMetadata(META_TYX_PROXY, target.constructor);
    }

    public static define(target: Function): ProxyMetadata {
        let meta = this.get(target);
        if (!meta) {
            meta = ServiceMetadata.define(target) as any;
            Object.setPrototypeOf(meta, ProxyMetadata.prototype);
            Reflect.defineMetadata(META_TYX_PROXY, meta, target);
        }
        return meta;
    }

    public commit(service?: string, application?: string, functionName?: string): this {
        this.service = service || this.target.name.replace("Proxy", "");
        this.functionName = functionName || (this.name + "-function");
        this.application = application;
        super.commit(service);
        return this;
    }
}