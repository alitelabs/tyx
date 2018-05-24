import { EventAdapter } from "../types";
import { MethodMetadata } from "./method";

export interface EventMetadata extends MethodMetadata {
    events: Record<string, EventRouteMetadata>;
}

export interface EventRouteMetadata {
    source: string;
    resource: string;
    objectFilter: string;
    actionFilter: string;
    adapter: EventAdapter;
}

export namespace EventMetadata {
    export function has(target: Object, propertyKey: string): boolean {
        return !!get(target, propertyKey);
    }

    export function get(target: Object, propertyKey: string): EventMetadata {
        let meta = MethodMetadata.get(target, propertyKey) as EventMetadata;
        return meta && meta.events && meta;
    }

    export function init(target: Object, propertyKey: string, descriptor?: PropertyDescriptor): EventMetadata {
        let method = MethodMetadata.define(target, propertyKey, descriptor) as EventMetadata;
        method.events = method.events || {};
        return method;
    }
}