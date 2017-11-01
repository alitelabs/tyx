import "../env";

import { Metadata } from "./common";
import { PermissionMetadata } from "./security";
import { RemoteMetadata } from "./remote";
import { RestMetadata, BindingMetadata } from "./rest";
import { EventMetadata } from "./event";

import {
    Service
} from "../decorators";

export interface ServiceMetadata extends Metadata {
    service: string;

    permissions: Record<string, PermissionMetadata>;
    remoteMetadata: Record<string, RemoteMetadata>;
    restMetadata: Record<string, RestMetadata>;
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
            meta.restMetadata = meta.restMetadata || {};
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

    export function restMetadata(target: Function | Object) {
        return get(target).restMetadata || {};
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