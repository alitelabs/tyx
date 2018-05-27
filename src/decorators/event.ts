import { Metadata } from "../metadata/core";
import { MethodMetadata } from "../metadata/method";
import { EventAdapter } from "../types";

export function Event(source: string, resource: string,
    actionFilter: string | boolean, objectFilter: string, adapter: EventAdapter): MethodDecorator {
    return (target, propertyKey, descriptor) => {
        Metadata.trace(Event, { source, resource, actionFilter, objectFilter, adapter }, target, propertyKey);
        if (typeof propertyKey !== "string") throw new TypeError("propertyKey must be string");
        MethodMetadata.define(target, propertyKey, descriptor).addEvent(source, resource, actionFilter, objectFilter, adapter);
    };
}





