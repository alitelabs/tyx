import { AuthMetadata } from "./auth";
import { Metadata } from "./common";
import { EventMetadata } from "./event";
import { HttpMetadata } from "./http";

export interface ServiceMetadata extends Metadata {
    service: string;

    authMetadata: Record<string, AuthMetadata>;
    httpMetadata: Record<string, HttpMetadata>;
    eventMetadata: Record<string, EventMetadata[]>;
}

export namespace ServiceMetadata {
    export const META_TYX_SERVICE = "tyx:service";

    export function has(target: Function | Object): boolean {
        return Reflect.hasMetadata(META_TYX_SERVICE, target)
            || Reflect.hasMetadata(META_TYX_SERVICE, target.constructor);
    }

    export function get(target: Function | Object): ServiceMetadata {
        return Reflect.getMetadata(META_TYX_SERVICE, target)
            || Reflect.getMetadata(META_TYX_SERVICE, target.constructor);
    }

    export function define(target: Function, service?: string): ServiceMetadata {
        let meta = get(target);
        if (!meta) {
            meta = Metadata.define(target, service) as ServiceMetadata;
            meta.authMetadata = meta.authMetadata || {};
            meta.httpMetadata = meta.httpMetadata || {};
            meta.eventMetadata = meta.eventMetadata || {};
            Reflect.defineMetadata(META_TYX_SERVICE, meta, target);
        }
        meta.name = meta.service = service;
        return meta;
    }
}