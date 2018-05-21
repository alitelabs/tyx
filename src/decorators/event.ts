import { EventMetadata, OldEventMetadata, ServiceMetadata } from "../metadata";
import { EventAdapter } from "../types";

export function Event(source: string, resource: string,
    actionFilter: string | boolean, objectFilter: string,
    adapter: EventAdapter, auth?: () => MethodDecorator): MethodDecorator {
    return (target, propertyKey, descriptor) => {
        // TODO: Type error
        propertyKey = propertyKey.toString();
        let route = `${source} ${resource}`;
        actionFilter = actionFilter === true ? propertyKey.toString() : actionFilter;
        actionFilter = actionFilter || "*";
        objectFilter = objectFilter || "*";
        let meta = EventMetadata.define(target, propertyKey, descriptor);
        meta.events.push({
            route,
            source,
            resource,
            actionFilter,
            objectFilter,
            adapter
        });
        if (auth) auth()(target, propertyKey, descriptor);

        // TODO: REMOVE
        let eventMetadata: OldEventMetadata = {
            route,
            service: undefined,
            method: propertyKey,
            source,
            resource,
            actionFilter,
            objectFilter,
            adapter
        };
        let service = ServiceMetadata.get(target);
        service.eventMetadata[route] = service.eventMetadata[route] || [];
        service.eventMetadata[route].push(eventMetadata);
    };
}