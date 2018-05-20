import { EventMetadata, ServiceMetadata } from "../metadata";
import { EventAdapter } from "../types";

export function Event(source: string, resource: string,
    actionFilter: string | boolean, objectFilter: string, adapter: EventAdapter, permission?: Function): MethodDecorator {
    return (type, propertyKey, descriptor) => {
        let route = `${source} ${resource}`;
        actionFilter = actionFilter === true ? propertyKey.toString() : actionFilter;
        let eventMetadata: EventMetadata = {
            route,
            service: undefined,
            method: propertyKey.toString(),
            source,
            resource,
            actionFilter: actionFilter || "*",
            objectFilter: objectFilter || "*",
            adapter
        };

        let metadata = ServiceMetadata.get(type);
        metadata.eventMetadata[route] = metadata.eventMetadata[route] || [];
        metadata.eventMetadata[route].push(eventMetadata);

        if (permission && (!metadata.methodMetadata || !metadata.methodMetadata[propertyKey])) {
            permission()(type, propertyKey, descriptor);
        }
    };
}