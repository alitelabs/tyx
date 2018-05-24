import { ApiMetadata } from "./api";
import { META_TYX_SERVICE } from "./common";

export interface ServiceMetadata extends ApiMetadata {
    service: string;
}

export namespace ServiceMetadata {
    export function has(target: Function | Object): boolean {
        return Reflect.hasMetadata(META_TYX_SERVICE, target)
            || Reflect.hasMetadata(META_TYX_SERVICE, target.constructor);
    }

    export function get(target: Function | Object): ServiceMetadata {
        return Reflect.getMetadata(META_TYX_SERVICE, target)
            || Reflect.getMetadata(META_TYX_SERVICE, target.constructor);
    }

    export function define(target: Function, name?: string): ServiceMetadata {
        let meta = get(target);
        if (!meta) {
            meta = ApiMetadata.define(target, name) as ServiceMetadata;
            Reflect.defineMetadata(META_TYX_SERVICE, meta, target);
        }
        if (name) meta.service = meta.name = name;
        if (!meta.name) meta.name = meta.service = target.name.replace("Service", "");
        return meta;
    }
}