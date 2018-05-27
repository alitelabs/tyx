import { Metadata } from "../metadata/common";
import { ServiceMetadata } from "../metadata/service";
import { Class } from "../types";

// TODO: resource as resolver function, to be used for logger or similar
export function Inject(resource?: string | Class, application?: string): PropertyDecorator {
    return (target, propertyKey) => {
        if (typeof propertyKey !== "string") throw new TypeError("propertyKey must be string");
        Metadata.trace(Inject, { resource, application }, target, propertyKey);
        ServiceMetadata.define(target.constructor).inject(propertyKey, resource, application);
    };
}