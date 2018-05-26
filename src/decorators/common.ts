import { Metadata } from "../metadata/common";

// TODO: resource as resolver function, to be used for logger or similar
export function Inject(resource?: string | Function, application?: string): PropertyDecorator {
    return (target, propertyKey) => {
        if (typeof propertyKey !== "string") throw new TypeError("propertyKey must be string");
        Metadata.trace(Inject, { resource, application }, target, propertyKey);
        Metadata.define(target.constructor).inject(propertyKey, resource, application);
    };
}