import { ApiMetadata } from "./api";
import { META_TYX_SERVICE, Metadata } from "./common";
import { Logger } from "../logger";
import { Context } from "../types";

export interface Service {
    log?: Logger;
    initialize?(): Promise<any>;
    activate?(ctx?: Context): Promise<void>;
    release?(ctx?: Context): Promise<void>;
}

export function Service(name?: string): ClassDecorator {
    return (target) => {
        Metadata.trace(Service, target);
        return void ServiceMetadata.define(target, name);
    };
}

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

        Object.values(meta.authMetadata).forEach(item => item.service = meta.service);
        Object.values(meta.resolverMetadata).forEach(item => item.service = meta.service);
        Object.values(meta.httpMetadata).forEach(item => item.service = meta.service);
        Object.values(meta.eventMetadata).forEach(item => item.forEach(h => h.service = meta.service));

        return meta;
    }
}