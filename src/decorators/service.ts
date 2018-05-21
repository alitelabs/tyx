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
        let meta = ServiceMetadata.get(target);
        name = meta.name = name || meta.name || target.name;
        Object.values(meta.methodMetadata).forEach(item => item.api = name);
        Object.values(meta.httpMetadata).forEach(item => item.api = name);
        Object.values(meta.remoteMetadata).forEach(item => item.api = name);
        Object.values(meta.bindingMetadata).forEach(item => item.api = name);
        Object.values(meta.eventMetadata).forEach(item => item.forEach(h => h.api = name));
    };
}

export function Service(name?: string): ClassDecorator {
    return (target) => {
        let meta = ServiceMetadata.get(target);
        name = meta.name = name || meta.name || target.name;
        meta.service = name;
        Object.values(meta.methodMetadata).forEach(item => item.service = name);
        Object.values(meta.httpMetadata).forEach(item => item.service = name);
        Object.values(meta.remoteMetadata).forEach(item => item.service = name);
        Object.values(meta.bindingMetadata).forEach(item => item.service = name);
        Object.values(meta.eventMetadata).forEach(item => item.forEach(h => h.service = name));
    };
}

// TODO: resource as resolver function, to be used for logger or similar
export function Inject(resource?: string | Function, application?: string): PropertyDecorator {
    return (target, propertyKey) => {
        if (!resource) {
            resource = Reflect.getMetadata("design:type", target, propertyKey);
        }

        if (resource instanceof Function) {
            resource = resource.name;
        } else {
            resource = resource.toString();
        }

        let metadata = Metadata.get(target);
        metadata.dependencies = metadata.dependencies || {};
        metadata.dependencies[propertyKey] = { resource, application };
    };
}