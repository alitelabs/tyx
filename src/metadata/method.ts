import * as Utils from "../utils/misc";
import { META_DESIGN_PARAMS, META_DESIGN_RETURN, META_TYX_METHOD, TypeInfo } from "./common";

export interface MethodMetadata {
    api?: string;
    service?: string;
    method: string;
    design: {
        args: TypeInfo[];
        returns: TypeInfo;
    };
}

export namespace MethodMetadata {
    export function has(target: Object, propertyKey: string): boolean {
        return Reflect.hasMetadata(META_TYX_METHOD, target, propertyKey);
    }

    export function get(target: Object, propertyKey: string): MethodMetadata {
        return Reflect.getMetadata(META_TYX_METHOD, target, propertyKey);
    }

    export function define(target: Object, propertyKey: string, descriptor?: PropertyDescriptor): MethodMetadata {
        let meta = Reflect.getMetadata(META_TYX_METHOD, target, propertyKey) as MethodMetadata;
        if (meta && meta.design.returns.name === "done") return meta;
        if (!meta) {
            meta = { service: undefined, method: propertyKey, design: { args: [], returns: null } };
            Reflect.defineMetadata(META_TYX_METHOD, meta, target, propertyKey);
        }
        let names = descriptor ? Utils.getArgs(descriptor.value as any) : [];
        let types: any[] = Reflect.getMetadata(META_DESIGN_PARAMS, target, propertyKey);
        let rtype = Reflect.getMetadata(META_DESIGN_RETURN, target, propertyKey);
        types.forEach((type, i) => meta.design.args[i] = { ...meta.design.args[i], name: names[i], type: type.name, constructor: type });
        meta.design.returns = { name: descriptor ? "done" : undefined, type: rtype.name, constructor: rtype };
        return meta;
    }
}

