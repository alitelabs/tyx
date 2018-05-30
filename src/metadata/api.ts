import { Class, Prototype } from "../types/core";
import { MethodMetadata } from "./method";
import { Registry } from "./registry";

export interface ApiMetadata {
    target: Class;
    alias: string;

    methods: Record<string, MethodMetadata>;
    routes: Record<string, MethodMetadata>;
    events: Record<string, MethodMetadata[]>;
}

export class ApiMetadata implements ApiMetadata {
    public target: Class;
    public alias: string;

    public methods: Record<string, MethodMetadata> = {};
    public routes: Record<string, MethodMetadata> = {};
    public events: Record<string, MethodMetadata[]> = {};

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