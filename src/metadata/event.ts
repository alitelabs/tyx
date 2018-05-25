import { Metadata } from "./common";
import { EventAdapter } from "../types";
import { ApiMetadata } from "./api";
import { MethodMetadata } from "./method";

export function Event(source: string, resource: string,
    actionFilter: string | boolean, objectFilter: string,
    adapter: EventAdapter, auth?: () => MethodDecorator): MethodDecorator {
    return (target, propertyKey, descriptor) => {
        Metadata.trace(Event, target, propertyKey);
        if (typeof propertyKey !== "string") throw new TypeError("propertyKey must be string");
        EventMetadata.append(target, propertyKey, descriptor, source, resource, actionFilter, objectFilter, adapter, auth);
    };
}

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

    export function append(target: Object, propertyKey: string, descriptor: PropertyDescriptor,
        source: string, resource: string,
        actionFilter: string | boolean, objectFilter: string,
        adapter: EventAdapter, auth?: () => MethodDecorator) {
        let route = `${source} ${resource}`;
        actionFilter = actionFilter === true ? propertyKey.toString() : actionFilter;
        actionFilter = actionFilter || "*";
        objectFilter = objectFilter || "*";
        let meta = EventMetadata.init(target, propertyKey, descriptor);
        meta.events[route] = {
            source,
            resource,
            actionFilter,
            objectFilter,
            adapter
        };
        if (auth) auth()(target, propertyKey, descriptor);
        let service = ApiMetadata.init(target.constructor);
        service.eventMetadata[route] = service.eventMetadata[route] || [];
        service.eventMetadata[route].push(meta);
    }
}