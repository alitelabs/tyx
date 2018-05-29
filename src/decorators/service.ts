import { Context } from "..";
import { Di } from "../import";
import { Logger } from "../logger";
import { Registry } from "../metadata/registry";
import { ServiceMetadata } from "../metadata/service";
import { Utils } from "../utils";

export interface Service {
    log?: Logger;
    activate?(ctx?: Context): Promise<void>;
    release?(ctx?: Context): Promise<void>;
}

// TODO (name?: string, ...apis: Function[])
// TODO: Selector
export function Service(alias?: string): ClassDecorator {
    return (target) => {
        Registry.trace(Service, { alias }, target);
        ServiceMetadata.define(target).commit(alias);
        return Di.Service(alias)(target);
    };
}

export function Inject(resource?: string): PropertyDecorator & ParameterDecorator {
    return (target, propertyKey, index?) => {
        if (typeof propertyKey !== "string"
            && !propertyKey === undefined) throw new TypeError("propertyKey must be string");
        // propertyKey = propertyKey || "<constructor>";
        Registry.trace(Inject, { resource }, target, propertyKey, index);
        let constructor = Utils.isClass(target) ? target : target.constructor;
        ServiceMetadata.define(constructor).inject(propertyKey, index, resource);
        return Di.Inject(resource)(target, propertyKey, index);
    };
}

/**
 * Decorate method providing service initialization.
 */
export function Initializer(): MethodDecorator {
    return (target, propertyKey, descriptor) => {
        Registry.trace(Handler, {}, target);
        if (typeof propertyKey !== "string") throw new TypeError("propertyKey must be string");
        ServiceMetadata.define(target.constructor).setInitializer(propertyKey, descriptor);
    };
}

/**
 * Decorate method providing per request activation.
 */
export function Selector(): MethodDecorator {
    return (target, propertyKey, descriptor) => {
        Registry.trace(Selector, {}, target);
        if (typeof propertyKey !== "string") throw new TypeError("propertyKey must be string");
        ServiceMetadata.define(target.constructor).setSelector(propertyKey, descriptor);
    };
}

/**
 * Decorate method providing per request activation.
 */
export function Activator(): MethodDecorator {
    return (target, propertyKey, descriptor) => {
        Registry.trace(Activator, {}, target);
        if (typeof propertyKey !== "string") throw new TypeError("propertyKey must be string");
        ServiceMetadata.define(target.constructor).setActivator(propertyKey, descriptor);
    };
}

/**
 * Decorate method providing per request release.
 */
export function Releasor(): MethodDecorator {
    return (target, propertyKey, descriptor) => {
        Registry.trace(Releasor, {}, target);
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
        Registry.trace(Handler, {}, target);
        if (typeof propertyKey !== "string") throw new TypeError("propertyKey must be string");
        ServiceMetadata.define(target.constructor).addHandler(propertyKey, descriptor);
    };
}

