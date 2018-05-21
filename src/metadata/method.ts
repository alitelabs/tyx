import * as Utils from "../utils/misc";

export type MethodArgMetadata = {
    name?: string;
    type: string;
    constructor: Function;
};

export interface MethodMetadata {
    api?: string;
    service?: string;
    method: string;
    args: MethodArgMetadata[];
    returns: MethodArgMetadata;
}

export namespace MethodMetadata {
    export const META_TYX_METHOD = "tyx:method";

    export function has(target: Object, propertyKey: string): boolean {
        return Reflect.hasMetadata(META_TYX_METHOD, target, propertyKey);
    }

    export function get(target: Object, propertyKey: string): MethodMetadata {
        return Reflect.getMetadata(META_TYX_METHOD, target, propertyKey);
    }

    export function define(target: Object, propertyKey: string, descriptor?: PropertyDescriptor): MethodMetadata {
        let meta = Reflect.getMetadata(META_TYX_METHOD, target, propertyKey);
        if (meta && meta.returns.name === "done") return meta;
        if (!meta) {
            meta = { service: undefined, method: propertyKey };
            Reflect.defineMetadata(META_TYX_METHOD, meta, target, propertyKey);
        }
        let names = descriptor ? Utils.getArgs(descriptor.value as any) : [];
        let types: any[] = Reflect.getMetadata("design:paramtypes", target, propertyKey);
        let rtype = Reflect.getMetadata("design:returntype", target, propertyKey);
        meta.args = meta.args || [];
        types.forEach((type, i) => meta.args[i] = { ...meta.args[i], name: names[i], type: type.name, constructor: type });
        meta.returns = { name: descriptor ? "done" : undefined, type: rtype.name, constructor: rtype };
        return meta;
    }
}

