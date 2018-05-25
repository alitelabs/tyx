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

    export function init(target: Function): ServiceMetadata {
        let meta = get(target);
        if (!meta) {
            meta = ApiMetadata.init(target) as ServiceMetadata;
            Reflect.defineMetadata(META_TYX_SERVICE, meta, target);
        }
        return meta;
    }

    export function define(target: Function, name?: string): ServiceMetadata {
        let meta = init(target);
        if (name) meta.service = meta.name = name;
        if (!meta.name) meta.name = meta.service = target.name.replace("Service", "");
        if (!meta.service) meta.service = meta.api || meta.name;
        Object.values(meta.methodMetadata).forEach(item => item.service = meta.service);
        return meta;
    }
}