export interface Metadata {
    name: string;
    dependencies?: Record<string, DependencyMetadata>;
}

export interface DependencyMetadata {
    resource: string;
    application: string;
}

export namespace OMetadata {
    const $metadata = Symbol("metadata");

    export function get(target: Function | Object, init?: boolean): Metadata {
        let type: any = null;
        if (typeof target === "function") type = target;
        else if (typeof target === "object") type = target.constructor;
        if (type && !type[$metadata] && init !== false) type[$metadata] = {};
        return type && type[$metadata];
    }

    export function name(target: Function | Object) {
        let meta = get(target, false);
        return meta && meta.name;
    }
}

export namespace Metadata {
    export const META_TYX = "tyx:metadata";

    export function has(target: Function | Object): boolean {
        return Reflect.hasMetadata(META_TYX, target)
            || Reflect.hasMetadata(META_TYX, target.constructor);
    }

    export function gett(target: Function | Object): Metadata {
        return Reflect.getMetadata(META_TYX, target)
            || Reflect.getMetadata(META_TYX, target.constructor);
    }

    export function name(target: Function | Object) {
        let meta = gett(target);
        return meta && meta.name;
    }

    // tslint:disable-next-line:no-shadowed-variable
    export function define(target: Function, name?: string): Metadata {
        let meta = gett(target);
        if (!meta) {
            meta = { name, dependencies: {} };
            Reflect.defineMetadata(META_TYX, meta, target);
        }
        meta.name = name || target.name;
        return meta;
    }
}

