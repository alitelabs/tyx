import { Service } from "../decorators";
import { Metadata } from "./common";
import { EventMetadata } from "./event";
import { BindingMetadata, HttpMetadata } from "./http";
import { RemoteMetadata } from "./remote";
import { PermissionMetadata } from "./security";

export interface ServiceMetadata extends Metadata {
    service: string;

    permissions: Record<string, PermissionMetadata>;
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
            meta.permissions = meta.permissions || {};
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

    export function permissions(target: Function | Object): Record<string, PermissionMetadata> {
        return get(target).permissions || {};
    }
}