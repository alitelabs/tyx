import { EventMetadata, ServiceMetadata } from "../metadata";
import { EventAdapter } from "../types";

export function Event(source: string, resource: string,
    actionFilter: string | boolean, objectFilter: string,
    adapter: EventAdapter, auth?: () => MethodDecorator): MethodDecorator {
    return (target, propertyKey, descriptor) => {
        if (typeof propertyKey !== "string") throw new TypeError("propertyKey must be string");
        let route = `${source} ${resource}`;
        actionFilter = actionFilter === true ? propertyKey.toString() : actionFilter;
        actionFilter = actionFilter || "*";
        objectFilter = objectFilter || "*";
        let meta = EventMetadata.define(target, propertyKey, descriptor);
        meta.events[route] = {
            source,
            resource,
            actionFilter,
            objectFilter,
            adapter
        };
        if (auth) auth()(target, propertyKey, descriptor);
        let service = ServiceMetadata.define(target.constructor);
        service.eventMetadata[route] = service.eventMetadata[route] || [];
        service.eventMetadata[route].push(meta);
    };
}