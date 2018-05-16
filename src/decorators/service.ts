import { Logger } from "../logger";
import { Metadata, ServiceMetadata } from "../metadata";
import { Context } from "../types";

export interface Service {
    log?: Logger;
    activate?(ctx?: Context): Promise<void>;
    release?(ctx?: Context): Promise<void>;
}

export function Service(name?: string) {
    return function (type: Function) {
        name = name || type.name;

        let meta = ServiceMetadata.get(type);
        meta.name = meta.service = name;
        for (let x of Object.keys(meta.permissions)) meta.permissions[x].service = name;
        for (let x of Object.keys(meta.httpMetadata)) meta.httpMetadata[x].service = name;
        for (let x of Object.keys(meta.remoteMetadata)) meta.remoteMetadata[x].service = name;
        for (let x of Object.keys(meta.bindingMetadata)) meta.bindingMetadata[x].service = name;
        for (let x of Object.keys(meta.eventMetadata)) meta.eventMetadata[x].forEach(h => h.service = name);
    };
}

export function Inject(resource?: string | Function, application?: string) {
    return function (type: Object, propertyKey: string) {
        if (!resource) {
            resource = Reflect.getMetadata("design:type", type, propertyKey);
        }

        if (resource instanceof Function) {
            resource = resource.name;
        } else {
            resource = resource.toString();
        }

        let metadata = Metadata.get(type);
        metadata.dependencies = metadata.dependencies || {};
        metadata.dependencies[propertyKey] = { resource, application };
    };
}