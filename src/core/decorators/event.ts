import "../env";

import {
    EventAdapter
} from "../types";

import {
    EventMetadata,
    ServiceMetadata
} from "../metadata";

export function Event(source: string, resource: string, actionFilter: string, objectFilter: string, adapter: EventAdapter, permission?: Function) {
    return function (type: any, propertyKey: string, descriptor: PropertyDescriptor) {
        let route = `${source} ${resource}`;
        let eventMetadata: EventMetadata = {
            route,
            service: undefined,
            method: propertyKey,
            source,
            resource,
            objectFilter: objectFilter || "*",
            actionFilter: actionFilter || "*",
            adapter
        };

        let metadata = ServiceMetadata.get(type);
        metadata.eventMetadata[route] = metadata.eventMetadata[route] || [];
        metadata.eventMetadata[route].push(eventMetadata);

        if (permission && (!metadata.permissions || !metadata.permissions[propertyKey])) {
            permission()(type, propertyKey, descriptor);
        }
    };
}