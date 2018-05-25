import { Logger } from "../logger";
import { Metadata, ServiceMetadata } from "../metadata";
import { Context } from "../types";

export interface Service {
    log?: Logger;
    initialize?(): Promise<any>;
    activate?(ctx?: Context): Promise<void>;
    release?(ctx?: Context): Promise<void>;
}

export function Service(name?: string): ClassDecorator {
    return (target) => {
        Metadata.trace(Service, { name }, target);
        return void ServiceMetadata.define(target, name);
    };
}