import "../env";

export interface Metadata  {
    name: string;
    dependencies?: Record<string, DependencyMetadata>;
}

export namespace Metadata {
    const $metadata = Symbol("metadata");

    export function get(target: Function | Object, init?: boolean): Metadata {
        let type: any = null;
        if (typeof target === "function") type = target;
        else if (typeof target === "object") type = target.constructor;
        if (type && !type[$metadata] && init !== false) type[$metadata] = { };
        return type && type[$metadata];
    }

    export function dependencies(type: Function | Object) {
        let metadata = get(type) as Metadata;
        return metadata.dependencies || {};
    }
}

export interface DependencyMetadata {
    resource: string;
    application: string;
}

