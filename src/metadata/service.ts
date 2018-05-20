import { Service } from "../decorators";
import { Metadata } from "./common";
import { EventMetadata } from "./event";
import { BindingMetadata, HttpMetadata } from "./http";
import { MethodMetadata } from "./method";
import { RemoteMetadata } from "./remote";

export interface ServiceMetadata extends Metadata {
    service: string;

    methodMetadata: Record<string, MethodMetadata>;
    remoteMetadata: Record<string, RemoteMetadata>;
    httpMetadata: Record<string, HttpMetadata>;
    eventMetadata: Record<string, EventMetadata[]>;

    bindingMetadata: Record<string, BindingMetadata>;
}

export namespace ServiceMetadata {
    export function has(target: Function | Object): target is Service {
        let meta = get(target, false);
        return !!(meta && meta.service);
    }

    export function get(target: Function | Object, init?: boolean): ServiceMetadata {
        let meta = Metadata.get(target, init) as ServiceMetadata;
        if (init !== false) {
            meta.methodMetadata = meta.methodMetadata || {};
            meta.remoteMetadata = meta.remoteMetadata || {};
            meta.httpMetadata = meta.httpMetadata || {};
            meta.eventMetadata = meta.eventMetadata || {};
            meta.bindingMetadata = meta.bindingMetadata || {};
        }
        return meta;
    }

    export function service(target: Function | Object): string {
        return get(target).service;
    }

    export function remoteMetadata(target: Function | Object) {
        return get(target).remoteMetadata || {};
    }

    export function httpMetadata(target: Function | Object) {
        return get(target).httpMetadata || {};
    }

    export function eventMetadata(target: Function | Object) {
        return get(target).eventMetadata || {};
    }

    export function bindingMetadata(target: Function | Object) {
        return get(target).bindingMetadata || {};
    }

    export function methodMetadata(target: Function | Object): Record<string, MethodMetadata> {
        return get(target).methodMetadata || {};
    }
}