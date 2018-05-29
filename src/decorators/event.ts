import { Registry } from "../metadata/registry";
import { MethodMetadata } from "../metadata/method";
import { EventAdapter } from "../types/event";

export function Event(source: string, resource: string,
    actionFilter: string | boolean, objectFilter: string, adapter: EventAdapter): MethodDecorator {
    return (target, propertyKey, descriptor) => {
        Registry.trace(Event, { source, resource, actionFilter, objectFilter, adapter }, target, propertyKey);
        if (typeof propertyKey !== "string") throw new TypeError("propertyKey must be string");
        MethodMetadata.define(target, propertyKey, descriptor).addEvent(source, resource, actionFilter, objectFilter, adapter);
    };
}





