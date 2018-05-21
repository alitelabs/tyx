
export interface TypeMetadata {
    kind: string;
    name: string;
    fields: Record<string, FieldMetadata>;
}

export interface FieldMetadata {
    name: string;
    type: string;
    required: boolean;
}

export namespace TypeMetadata {
    export const META_TYX_TYPE = "tyx:type";

    export function has(target: Function | Object): boolean {
        return Reflect.hasMetadata(META_TYX_TYPE, target)
            || Reflect.hasMetadata(META_TYX_TYPE, target.constructor);
    }

    export function get(target: Function | Object): TypeMetadata {
        return Reflect.getMetadata(META_TYX_TYPE, target)
            || Reflect.getMetadata(META_TYX_TYPE, target.constructor);
    }

    export function define(target: Function, kind?: string, name?: string): TypeMetadata {
        let meta = get(target);
        if (!meta) {
            meta = { name: undefined, kind: undefined, fields: {} };
            Reflect.defineMetadata(META_TYX_TYPE, meta, target);
        }
        return meta;
    }
}