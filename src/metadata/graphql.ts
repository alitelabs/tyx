import { DesignMetadata } from ".";
import { GraphType } from "../types";
import { META_TYX_TYPE } from "./common";

export interface GraphMetadata {
    api?: string;
    type: GraphType;
    name?: string;
    fields?: Record<string, FieldMetadata>;
    target?: Function;
    schema?: string;
}

export interface FieldMetadata {
    name: string;
    type: GraphType;
    required: boolean;
    item: GraphMetadata;
    design: DesignMetadata;
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

    export function init(target: Function): GraphMetadata {
        let meta = get(target);
        if (!meta) {
            meta = { api: undefined, type: undefined, name: undefined, fields: {} };
            Reflect.defineMetadata(META_TYX_TYPE, meta, target);
        }
        return meta;
    }

    export function resolve(target: Function, type: GraphType, name?: string): GraphMetadata {
        if (type && !GraphType.isRoot(type) && !GraphType.isItem(type)) throw new TypeError(`Not a root type: ${type}`);
        let meta = init(target);
        meta.type = type;
        meta.name = name || target.name;
        return meta;
    }
}