import { Service } from "../decorators";
import { AuthMetadata } from "./auth";
import { Metadata } from "./common";
import { OldBindingMetadata, OldEventMetadata, OldHttpMetadata } from "./old";

export interface ServiceMetadata extends Metadata {
    service: string;

    authMetadata: Record<string, AuthMetadata>;
    httpMetadata: Record<string, OldHttpMetadata>;
    eventMetadata: Record<string, OldEventMetadata[]>;

    bindingMetadata: Record<string, OldBindingMetadata>;
}

export namespace ServiceMetadata {
    export function has(target: Function | Object): target is Service {
        let meta = get(target, false);
        return !!(meta && meta.service);
    }

    export function get(target: Function | Object, init?: boolean): ServiceMetadata {
        let meta = Metadata.get(target, init) as ServiceMetadata;
        if (init !== false) {
            meta.authMetadata = meta.authMetadata || {};
            meta.httpMetadata = meta.httpMetadata || {};
            meta.eventMetadata = meta.eventMetadata || {};
            meta.bindingMetadata = meta.bindingMetadata || {};
        }
        return meta;
    }

    export function service(target: Function | Object): string {
        return get(target).service;
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

    export function authMetadata(target: Function | Object): Record<string, AuthMetadata> {
        return get(target).authMetadata || {};
    }
}