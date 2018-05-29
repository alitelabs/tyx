import { Class, Prototype } from "../types/core";
import { ApiMetadata } from "./api";
import { Registry } from "./registry";

export interface InjectMetadata {
    resource: string;
    target?: Class;
    index?: number;
}

export interface HandlerMetadata {
    service?: string;
    method: string;
    target: Class;
}

export interface ServiceMetadata {
    target: Class;
    alias: string;
    dependencies: Record<string, InjectMetadata>;
    handlers: Record<string, HandlerMetadata>;

    initializer: HandlerMetadata;
    selector: HandlerMetadata;
    activator: HandlerMetadata;
    releasor: HandlerMetadata;
}

export class ServiceMetadata implements ServiceMetadata {
    public target: Class;
    public alias: string;
    public dependencies: Record<string, InjectMetadata> = undefined;
    public handlers: Record<string, HandlerMetadata> = undefined;

    public initializer: HandlerMetadata = undefined;
    public selector: HandlerMetadata = undefined;
    public activator: HandlerMetadata = undefined;
    public releasor: HandlerMetadata = undefined;

    constructor(target: Class) {
        this.target = target;
        this.alias = this.alias = target.name;
    }

    public static has(target: Class | Prototype): boolean {
        return Reflect.hasMetadata(Registry.TYX_SERVICE, target)
            || Reflect.hasMetadata(Registry.TYX_SERVICE, target.constructor);
    }

    public static get(target: Class | Prototype): ServiceMetadata {
        return Reflect.getMetadata(Registry.TYX_SERVICE, target)
            || Reflect.getMetadata(Registry.TYX_SERVICE, target.constructor);
    }

    public static define(target: Class): ServiceMetadata {
        let meta = this.get(target);
        if (!meta) {
            meta = new ServiceMetadata(target);
            Reflect.defineMetadata(Registry.TYX_SERVICE, meta, target);
        }
        return meta;
    }

    public inject(propertyKey: string, index: number, resource?: string | Class) {
        if (!resource) {
            resource = Reflect.getMetadata(Registry.DESIGN_TYPE, this.target.prototype, propertyKey);
        }
        let target: Function;
        if (resource instanceof Function) {
            target = resource;
            resource = resource.name;
        } else {
            target = undefined;
            resource = resource.toString();
        }
        let key = (propertyKey || "[constructor]") + (index !== undefined ? `#${index}` : "");
        this.dependencies = this.dependencies || {};
        this.dependencies[key] = { resource, target, index };
    }

    public addHandler(propertyKey: string, descriptor: PropertyDescriptor): this {
        this.handlers = this.handlers || {};
        this.handlers[propertyKey] = { method: propertyKey, target: descriptor.value };
        return this;
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

    public commit(alias?: string): this {
        if (alias) this.alias = this.alias = alias;
        if (!this.alias) this.alias = this.alias = this.target.name;
        this.alias = this.alias || this.alias;
        if (this.initializer) this.initializer.service = this.alias;
        if (this.selector) this.selector.service = this.alias;
        if (this.activator) this.activator.service = this.alias;
        if (this.releasor) this.releasor.service = this.alias;
        if (this.handlers) Object.values(this.handlers).forEach(item => item.service = this.alias);
        let api = ApiMetadata.get(this.target);
        if (api) api.commit(alias);
        let prev = Registry.services[this.alias];
        if (prev && prev !== this) throw new TypeError(`Duplicate service alias [${this.alias}]`);
        Registry.services[this.alias] = this;
        return this;
    }
}