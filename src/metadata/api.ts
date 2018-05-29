import { Class, Prototype } from "../types";
import { Metadata } from "./core";
import { MethodMetadata } from "./method";
import { GraphMetadata, GraphType, TypeMetadata } from "./type";

export interface ApiMetadata {
    target: Class;
    alias: string;

    methods: Record<string, MethodMetadata>;
    inputs: Record<string, TypeMetadata>;
    results: Record<string, TypeMetadata>;

    routes: Record<string, MethodMetadata>;
    events: Record<string, MethodMetadata[]>;
}

export class ApiMetadata implements ApiMetadata {
    public target: Class;
    public alias: string;

    public methods: Record<string, MethodMetadata> = {};
    public inputs: Record<string, TypeMetadata> = {};
    public results: Record<string, TypeMetadata> = {};

    public routes: Record<string, MethodMetadata> = {};
    public events: Record<string, MethodMetadata[]> = {};

    constructor(target: Class) {
        this.target = target;
    }

    public static has(target: Class | Prototype): boolean {
        return Reflect.hasMetadata(Metadata.TYX_API, target)
            || Reflect.hasMetadata(Metadata.TYX_API, target.constructor);
    }

    public static get(target: Class | Prototype): ApiMetadata {
        return Reflect.getMetadata(Metadata.TYX_API, target)
            || Reflect.getMetadata(Metadata.TYX_API, target.constructor);
    }

    public static define(target: Class | Prototype): ApiMetadata {
        let meta = ApiMetadata.get(target);
        if (!meta) {
            target = (typeof target === "function") ? target : target.constructor;
            meta = new ApiMetadata(target as Class);
            Reflect.defineMetadata(Metadata.TYX_API, meta, target);
        }
        return meta;
    }

    public commit(alias?: string): this {
        this.alias = alias || this.target.name;
        let prev = Metadata.apis[this.alias];
        if (prev && prev !== this) throw new TypeError(`Duplicate API alias [${this.alias}]`);
        Metadata.apis[this.alias] = this;
        Object.values(this.methods).forEach(item => item.commit(this));
        this.schema();
        return this;
    }

    public schema(): string {
        for (let res of Object.values(this.methods)) {
            if (!res.query && !res.mutation) continue;
            res.input = this.resolve(res.input, true);
            res.result = this.resolve(res.result, false);
        }
        return "# " + this.alias;
    }

    // TODO: Generic
    protected resolve(meta: GraphMetadata, input: boolean): GraphMetadata {
        if (GraphType.isScalar(meta.type)) {
            meta.ref = meta.type;
            return meta;
        }
        if (meta.target && input && this.inputs[meta.target.name]) {
            return this.inputs[meta.target.name];
        }
        if (meta.target && !input && this.results[meta.target.name]) {
            return this.results[meta.target.name];
        }
        if (GraphType.isRef(meta.type)) {
            let target = TypeMetadata.get(meta.target);
            if (target) {
                target = this.resolve(target, input) as TypeMetadata;
                meta.ref = target.ref;
            } else {
                meta.ref = GraphType.Object;
            }
            return meta;
        }
        if (GraphType.isList(meta.type)) {
            let type = this.resolve(meta.item, input);
            if (type) {
                meta.ref = `[${type.ref}]`;
            } else {
                meta.ref = `[${GraphType.Object}]`;
            }
            return meta;
        }
        if (GraphType.isEntity(meta.type) && !input) {
            // TODO: Register imports
            meta.ref = meta.target.name;
            return meta;
        }
        if (input && !GraphType.isInput(meta.type))
            throw new TypeError(`Input type can not reference [${meta.type}]`);

        if (!input && GraphType.isInput(meta.type))
            throw new TypeError(`Result type can not reference [${meta.type}]`);

        let struc = meta as TypeMetadata;
        if (!GraphType.isStruc(struc.type) || !struc.fields)
            throw new TypeError(`Empty type difinition ${struc.target}`);

        // Generate schema
        struc.ref = struc.target.name;
        if (input) this.inputs[struc.ref] = struc; else this.results[struc.ref] = struc;
        let def = input ? `input ${struc.ref} {\n` : `type ${struc.ref} {\n`;
        for (let [key, field] of Object.entries(struc.fields)) {
            let res = this.resolve(field, input);
            def += `  ${key}: ${res.ref}\n`;
        }
        def += "}";
        struc.schema = def;

        return meta;
    }
}