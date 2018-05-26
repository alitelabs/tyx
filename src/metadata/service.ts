import { META_TYX_SERVICE, Metadata } from "./common";

export interface HandlerMetadata {
    service?: string;
    method: string;
    target: Function;
}

export interface ServiceMetadata {
    target: Function;
    service: string;

    initializer: HandlerMetadata;
    selector: HandlerMetadata;
    activator: HandlerMetadata;
    releasor: HandlerMetadata;
    handlers: Record<string, HandlerMetadata>;
}

export class ServiceMetadata implements ServiceMetadata {
    public name: string;
    public service: string;
    public initializer: HandlerMetadata = undefined;
    public selector: HandlerMetadata = undefined;
    public activator: HandlerMetadata = undefined;
    public releasor: HandlerMetadata = undefined;
    public handlers: Record<string, HandlerMetadata> = undefined;

    constructor(target: Function) {
        this.target = target;
        this.name = this.service = target.name;
    }

    public static has(target: Function | Object): boolean {
        return Reflect.hasMetadata(META_TYX_SERVICE, target)
            || Reflect.hasMetadata(META_TYX_SERVICE, target.constructor);
    }

    public static get(target: Function | Object): ServiceMetadata {
        return Reflect.getMetadata(META_TYX_SERVICE, target)
            || Reflect.getMetadata(META_TYX_SERVICE, target.constructor);
    }

    public static define(target: Function): ServiceMetadata {
        let meta = this.get(target);
        if (!meta) {
            Metadata.define(target);
            meta = new ServiceMetadata(target);
            Reflect.defineMetadata(META_TYX_SERVICE, meta, target);
        }
        return meta;
    }

    public setInitializer(propertyKey: string, descriptor: PropertyDescriptor): this {
        this.initializer = { method: propertyKey, target: descriptor.value };
        return this;
    }

    public setSelector(propertyKey: string, descriptor: PropertyDescriptor): this {
        this.selector = { method: propertyKey, target: descriptor.value };
        return this;
    }

    public setActivator(propertyKey: string, descriptor: PropertyDescriptor): this {
        this.activator = { method: propertyKey, target: descriptor.value };
        return this;
    }

    public setReleasor(propertyKey: string, descriptor: PropertyDescriptor): this {
        this.releasor = { method: propertyKey, target: descriptor.value };
        return this;
    }

    public addHandler(propertyKey: string, descriptor: PropertyDescriptor): this {
        this.handlers = this.handlers || {};
        this.handlers[propertyKey] = { method: propertyKey, target: descriptor.value };
        return this;
    }

    public commit(name?: string): this {
        if (name) this.service = this.name = name;
        if (!this.name) this.name = this.service = this.target.name.replace("Service", "");
        this.service = this.service || this.name;
        if (this.initializer) this.initializer.service = this.service;
        if (this.selector) this.selector.service = this.service;
        if (this.activator) this.activator.service = this.service;
        if (this.releasor) this.releasor.service = this.service;
        if (this.handlers) Object.values(this.handlers).forEach(item => item.service = this.service);
        return this;
    }
}