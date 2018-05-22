export const META_DESIGN_TYPE = "design:type";
export const META_DESIGN_PARAMS = "design:paramtypes";
export const META_DESIGN_RETURN = "design:returntype";

export const META_TYX_METADATA = "tyx:metadata";
export const META_TYX_SERVICE = "tyx:service";
export const META_TYX_PROXY = "tyx:proxy";
export const META_TYX_TYPE = "tyx:type";
export const META_TYX_METHOD = "tyx:method";

export type TypeInfo = {
    name?: string;
    type: string;
    constructor: Function;
};

export interface Metadata {
    name: string;
    dependencies?: Record<string, DependencyMetadata>;
}

export interface DependencyMetadata {
    resource: string;
    application: string;
}

export namespace Metadata {
    export function has(target: Function | Object): boolean {
        return Reflect.hasMetadata(META_TYX_METADATA, target)
            || Reflect.hasMetadata(META_TYX_METADATA, target.constructor);
    }

    export function get(target: Function | Object): Metadata {
        return Reflect.getMetadata(META_TYX_METADATA, target)
            || Reflect.getMetadata(META_TYX_METADATA, target.constructor);
    }

    export function name(target: Function | Object) {
        let meta = get(target);
        return meta && meta.name;
    }

    // tslint:disable-next-line:no-shadowed-variable
    export function define(target: Function, name?: string): Metadata {
        let meta = get(target);
        if (!meta) {
            meta = { name, dependencies: {} };
            Reflect.defineMetadata(META_TYX_METADATA, meta, target);
        }
        meta.name = name || target.name;
        return meta;
    }
}

