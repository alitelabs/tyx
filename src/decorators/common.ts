import { META_DESIGN_TYPE, Metadata } from "../metadata";

// TODO: resource as resolver function, to be used for logger or similar
export function Inject(resource?: string | Function, application?: string): PropertyDecorator {
    return (target, propertyKey) => {
        if (typeof propertyKey !== "string") throw new TypeError("propertyKey must be string");
        if (!resource) {
            resource = Reflect.getMetadata(META_DESIGN_TYPE, target, propertyKey);
        }
        if (resource instanceof Function) {
            resource = resource.name;
        } else {
            resource = resource.toString();
        }
        let metadata = Metadata.define(target.constructor);
        metadata.dependencies = metadata.dependencies || {};
        metadata.dependencies[propertyKey] = { resource, application };
    };
}