export const META_DESIGN_TYPE = "design:type";
export const META_DESIGN_PARAMS = "design:paramtypes";
export const META_DESIGN_RETURN = "design:returntype";

export const META_TYX_METADATA = "tyx:metadata";
export const META_TYX_API = "tyx:api";
export const META_TYX_SERVICE = "tyx:service";
export const META_TYX_PROXY = "tyx:proxy";
export const META_TYX_TYPE = "tyx:type";
export const META_TYX_METHOD = "tyx:method";

export const META_TYX_ENTITY = "tyx:entity";
export const META_TYX_COLUMN = "tyx:column";
export const META_TYX_RELATION = "tyx:relation";
export const META_TYX_ENTITIES = "tyx:entities";

// TODO: resource as resolver function, to be used for logger or similar
export function Inject(resource?: string | Function, application?: string): PropertyDecorator {
    return (target, propertyKey) => {
        if (typeof propertyKey !== "string") throw new TypeError("propertyKey must be string");
        Metadata.trace(Inject, target, propertyKey);
        Metadata.inject(target, propertyKey, resource, application);
    };
}

export interface Metadata {
    name: string;
    dependencies?: Record<string, InjectMetadata>;
}

export interface InjectMetadata {
    resource: string;
    application: string;
}

export namespace Metadata {
    let lastType: string;
    let lastProp: string | symbol;
    let lastDec: string;

    let traceLog: string = "";

    function log(line: string) {
        traceLog += line + "\n";
    }

    export function trace(decorator?: string | Function, target?: Object | Function, propertyKey?: string | symbol, index?: number) {
        if (!arguments.length) return traceLog;
        let dec = decorator instanceof Function ? decorator.name : decorator;
        let type = typeof target === "object" ? target.constructor : target;
        if (lastType !== type.name) {
            log("##############################################");
            log(`${type.name}:`);
            lastProp = null;
            lastDec = null;
        }
        if (propertyKey && lastProp !== propertyKey) {
            log(`  ${propertyKey}:`);
        }
        if (index !== undefined) {
            log(`    - [${index}] @${dec} `);
        } else if (propertyKey) {
            log(`    - @${dec}`);
        } else {
            if (lastProp || !lastDec) log("  $type:");
            log(`    - @${dec}`);
        }
        lastType = type.name;
        lastProp = propertyKey;
        lastDec = dec;
        return undefined;
    }

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
    export function init(target: Function, name?: string): Metadata {
        let meta = get(target);
        if (!meta) {
            meta = { name, dependencies: {} };
            Reflect.defineMetadata(META_TYX_METADATA, meta, target);
        }
        meta.name = name || target.name;
        return meta;
    }

    export function inject(target: Object, propertyKey: string, resource?: string | Function, application?: string) {
        if (!resource) {
            resource = Reflect.getMetadata(META_DESIGN_TYPE, target, propertyKey);
        }
        if (resource instanceof Function) {
            resource = resource.name;
        } else {
            resource = resource.toString();
        }
        let metadata = init(target.constructor);
        metadata.dependencies = metadata.dependencies || {};
        metadata.dependencies[propertyKey] = { resource, application };
    }
}

