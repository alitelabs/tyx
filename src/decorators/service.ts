import { Logger } from "../logger";
import { Metadata, ServiceMetadata } from "../metadata";
import { Context } from "../types";

export interface Service {
    log?: Logger;
    initialize?(): Promise<any>;
    activate?(ctx?: Context): Promise<void>;
    release?(ctx?: Context): Promise<void>;
}

// TODO (name?: string, ...apis: Function[])
// TODO: Selector
export function Service(name?: string): ClassDecorator {
    return (target) => {
        Metadata.trace(Service, { name }, target);
        ServiceMetadata.define(target).commit(name);
    };
}

/**
 * Decorate method providing service initialization.
 */
export function Initializer(): MethodDecorator {
    return (target, propertyKey, descriptor) => {
        Metadata.trace(Handler, {}, target);
        if (typeof propertyKey !== "string") throw new TypeError("propertyKey must be string");
        ServiceMetadata.define(target.constructor).setInitializer(propertyKey, descriptor);
    };
}

/**
 * Decorate method providing per request activation.
 */
export function Selector(): MethodDecorator {
    return (target, propertyKey, descriptor) => {
        Metadata.trace(Handler, {}, target);
        if (typeof propertyKey !== "string") throw new TypeError("propertyKey must be string");
        ServiceMetadata.define(target.constructor).setSelector(propertyKey, descriptor);
    };
}

/**
 * Decorate method providing per request activation.
 */
export function Activator(): MethodDecorator {
    return (target, propertyKey, descriptor) => {
        Metadata.trace(Handler, {}, target);
        if (typeof propertyKey !== "string") throw new TypeError("propertyKey must be string");
        ServiceMetadata.define(target.constructor).setActivator(propertyKey, descriptor);
    };
}

/**
 * Decorate method providing per request release.
 */
export function Releasor(): MethodDecorator {
    return (target, propertyKey, descriptor) => {
        Metadata.trace(Handler, {}, target);
        if (typeof propertyKey !== "string") throw new TypeError("propertyKey must be string");
        ServiceMetadata.define(target.constructor).setReleasor(propertyKey, descriptor);
    };
}

// TODO: (api: Function, method?: string)
/**
 * Decorate methods providing Api implementation.
 */
export function Handler(): MethodDecorator {
    return (target, propertyKey, descriptor) => {
        Metadata.trace(Handler, {}, target);
        if (typeof propertyKey !== "string") throw new TypeError("propertyKey must be string");
        ServiceMetadata.define(target.constructor).addHandler(propertyKey, descriptor);
    };
}
