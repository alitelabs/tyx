import { META_TYX_API } from "./common";
import { MethodMetadata } from "./method";
import { GraphMetadata, GraphType, TypeMetadata } from "./type";

export interface ApiMetadata {
    name: string;
    api: string;

    methods: Record<string, MethodMetadata>;
    inputs: Record<string, TypeMetadata>;
    results: Record<string, TypeMetadata>;

    routes: Record<string, MethodMetadata>;
    events: Record<string, MethodMetadata[]>;
}

export class ApiMetadata implements ApiMetadata {
    public target: Function;
    public name: string;
    public api: string;

    public methods: Record<string, MethodMetadata> = {};
    public inputs: Record<string, TypeMetadata> = {};
    public results: Record<string, TypeMetadata> = {};

    public routes: Record<string, MethodMetadata> = {};
    public events: Record<string, MethodMetadata[]> = {};

    constructor(target: Function) {
        this.target = target;
    }

    public static has(target: Function | Object): boolean {
        return Reflect.hasMetadata(META_TYX_API, target)
            || Reflect.hasMetadata(META_TYX_API, target.constructor);
    }

    public static get(target: Function | Object): ApiMetadata {
        return Reflect.getMetadata(META_TYX_API, target)
            || Reflect.getMetadata(META_TYX_API, target.constructor);
    }

    public static define(target: Function): ApiMetadata {
        let meta = ApiMetadata.get(target);
        if (!meta) {
            meta = new ApiMetadata(target);
            Reflect.defineMetadata(META_TYX_API, meta, target);
        }
        return meta;
    }

    public commit(name?: string): this {
        if (name) this.name = this.api = name;
        if (!this.api) this.name = this.api = this.target.name;
        Object.values(this.methods).forEach(item => item.api = this.api);
        this.schema();
        return this;
    }

    public schema(): string {
        for (let res of Object.values(this.methods)) {
            if (!res.query && !res.mutation) continue;
            res.input = this.resolve(res.input, true);
            res.result = this.resolve(res.result, false);
        }
        return "# " + this.name;
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