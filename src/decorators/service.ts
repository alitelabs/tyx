import { Logger } from "../logger";
import { Metadata, ServiceMetadata } from "../metadata";
import { Context } from "../types";

export interface Service {
    log?: Logger;
    initialize?(): Promise<any>;
    activate?(ctx?: Context): Promise<void>;
    release?(ctx?: Context): Promise<void>;
}

export function Api(name?: string): ClassDecorator {
    return (target) => {
        let meta = ServiceMetadata.define(target, name);
        Object.values(meta.authMetadata).forEach(item => item.api = meta.name);
        Object.values(meta.httpMetadata).forEach(item => item.api = meta.name);
        Object.values(meta.eventMetadata).forEach(item => item.forEach(h => h.api = meta.name));
    };
}

export function Service(name?: string): ClassDecorator {
    return (target) => {
        let meta = ServiceMetadata.define(target, name);
        Object.values(meta.authMetadata).forEach(item => item.service = meta.name);
        Object.values(meta.httpMetadata).forEach(item => item.service = meta.name);
        Object.values(meta.eventMetadata).forEach(item => item.forEach(h => h.service = meta.name));
    };
}

// TODO: resource as resolver function, to be used for logger or similar
export function Inject(resource?: string | Function, application?: string): PropertyDecorator {
    return (target, propertyKey) => {
        if (typeof propertyKey !== "string") throw new TypeError("propertyKey must be string");
        if (!resource) {
            resource = Reflect.getMetadata("design:type", target, propertyKey);
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