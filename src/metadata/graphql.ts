import { GraphType } from "../types";
import { META_TYX_TYPE, TypeInfo } from "./common";

export interface GraphMetadata {
    type: GraphType;
    name: string;
    fields: Record<string, FieldMetadata>;
}

export interface FieldMetadata {
    name: string;
    type: GraphType;
    required: boolean;
    item: TypeInfo;
    design: TypeInfo;
}

export namespace GraphMetadata {
    export function has(target: Function | Object): boolean {
        return Reflect.hasMetadata(META_TYX_TYPE, target)
            || Reflect.hasMetadata(META_TYX_TYPE, target.constructor);
    }

    export function get(target: Function | Object): GraphMetadata {
        return Reflect.getMetadata(META_TYX_TYPE, target)
            || Reflect.getMetadata(META_TYX_TYPE, target.constructor);
    }

    export function define(target: Function, type?: GraphType, name?: string): GraphMetadata {
        if (type && !GraphType.isRoot(type) && !GraphType.isItem(type)) throw new TypeError(`Not a root type: ${type}`);
        let meta = get(target);
        if (!meta) {
            meta = { type, name, fields: {} };
            Reflect.defineMetadata(META_TYX_TYPE, meta, target);
        }
        meta.type = meta.type || type;
        meta.name = meta.name || name;
        return meta;
    }
}