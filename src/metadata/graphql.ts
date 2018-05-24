import { DesignMetadata } from ".";
import { GraphType } from "../types";
import { META_DESIGN_TYPE, META_TYX_TYPE } from "./common";


export interface GraphTypeMetadata {
    type: GraphType;
    item?: GraphMetadata;
    target?: Function;
    ref?: string;
    _schema?: string;
}

export interface GraphMetadata extends GraphTypeMetadata {
    api?: string;
    fields?: Record<string, FieldMetadata>;
}

export interface FieldMetadata extends GraphTypeMetadata {
    key: string;
    required: boolean;
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
            meta = { api: undefined, type: undefined, fields: {} };
            Reflect.defineMetadata(META_TYX_TYPE, meta, target);
        }
        return meta;
    }

    export function append(target: Object, propertyKey: string, type: GraphType, required: boolean, item?: GraphType | Function) {
        // TODO: Validata
        let meta = GraphMetadata.init(target.constructor);
        // TODO: use design type when not specified
        let design = Reflect.getMetadata(META_DESIGN_TYPE, target, propertyKey);
        let itemInfo: GraphMetadata = typeof item === "function"
            ? { type: GraphType.Ref, target: item }
            : { type: item };
        meta.fields[propertyKey] = {
            type,
            item: item && itemInfo,
            key: propertyKey,
            required,
            design: { type: design.name, target: design }
        };
    }

    export function resolve(target: Function, type: GraphType, name?: string): GraphMetadata {
        if (type && !GraphType.isRoot(type) && !GraphType.isItem(type)) throw new TypeError(`Not a root type: ${type}`);
        let meta = init(target);
        meta.type = type;
        meta.target = target;
        return meta;
    }
}