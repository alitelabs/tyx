import * as Utils from "../utils/misc";
import { META_DESIGN_PARAMS, META_DESIGN_RETURN, META_TYX_METHOD } from "./common";

export interface MethodMetadata {
    api?: string;
    service?: string;
    method: string;
    design: DesignMetadata[];
}

export type DesignMetadata = {
    name?: string;
    type: string;
    target: Function;
};

export namespace MethodMetadata {
    export function has(target: Object, propertyKey: string): boolean {
        return Reflect.hasMetadata(META_TYX_METHOD, target, propertyKey);
    }

    export function get(target: Object, propertyKey: string): MethodMetadata {
        return Reflect.getMetadata(META_TYX_METHOD, target, propertyKey);
    }

    export function define(target: Object, propertyKey: string, descriptor?: PropertyDescriptor): MethodMetadata {
        let meta = Reflect.getMetadata(META_TYX_METHOD, target, propertyKey) as MethodMetadata;
        let ret = meta && meta.design && meta.design[meta.design.length - 1];
        if (ret && ret.name === "#return") return meta;
        if (!meta) {
            meta = { api: undefined, service: undefined, method: propertyKey, design: [] };
            Reflect.defineMetadata(META_TYX_METHOD, meta, target, propertyKey);
        }
        let names = descriptor ? Utils.getArgs(descriptor.value as any) : [];
        let params: any[] = Reflect.getMetadata(META_DESIGN_PARAMS, target, propertyKey);
        let returns = Reflect.getMetadata(META_DESIGN_RETURN, target, propertyKey);
        params.forEach((param, i) => meta.design[i] = { name: names[i], type: param.name, target: param });
        meta.design[params.length] = { name: descriptor ? "#return" : undefined, type: returns.name, target: returns };
        return meta;
    }
}

