import { Class, Prototype } from "../types/core";
import { EventRouteMetadata, HttpRouteMetadata, MethodMetadata } from "./method";
import { Registry } from "./registry";

export interface ApiMetadata {
    target: Class;
    alias: string;

    methods: Record<string, MethodMetadata>;
    routes: Record<string, HttpRouteMetadata>;
    events: Record<string, EventRouteMetadata[]>;
}

export class ApiMetadata implements ApiMetadata {
    public target: Class;
    public alias: string;

    public methods: Record<string, MethodMetadata> = {};
    public routes: Record<string, HttpRouteMetadata> = {};
    public events: Record<string, EventRouteMetadata[]> = {};

    constructor(target: Class) {
        this.target = target;
    }

    public static has(target: Class | Prototype): boolean {
        return Reflect.hasMetadata(Registry.TYX_API, target)
            || Reflect.hasMetadata(Registry.TYX_API, target.constructor);
    }

    public static get(target: Class | Prototype): ApiMetadata {
        return Reflect.getMetadata(Registry.TYX_API, target)
            || Reflect.getMetadata(Registry.TYX_API, target.constructor);
    }

    public static define(target: Class | Prototype): ApiMetadata {
        let meta = ApiMetadata.get(target);
        if (!meta) {
            target = (typeof target === "function") ? target : target.constructor;
            meta = new ApiMetadata(target as Class);
            Reflect.defineMetadata(Registry.TYX_API, meta, target);
        }
        return meta;
    }

    public addMethod(meta: MethodMetadata) {
        this.methods[meta.methodId] = meta;
    }

    public addRoute(meta: HttpRouteMetadata) {
        if (this.routes[meta.routeId]) throw new Error(`Duplicate route: ${meta.routeId}`);
        this.routes[meta.routeId] = meta;
    }

    public addEvent(meta: EventRouteMetadata) {
        this.events[meta.eventId] = this.events[meta.eventId] || [];
        this.events[meta.eventId].push(meta);
    }

    public commit(alias?: string): this {
        this.alias = alias || this.target.name;
        let prev = Registry.apis[this.alias];
        if (prev && prev !== this) throw new TypeError(`Duplicate API alias [${this.alias}]`);
        Registry.apis[this.alias] = this;
        Object.values(this.methods).forEach(item => item.commit(this));
        // this.schema();
        return this;
    }
}