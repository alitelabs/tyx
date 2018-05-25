
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
        Metadata.trace(Inject, { resource, application }, target, propertyKey);
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

export interface TypeDecorationMetadata {
    target: Function;
    decorations?: DecoratorMetadata[];
    properties?: Record<string, PropertyDecorationMetadata>;
}

export interface PropertyDecorationMetadata {
    key: string;
    decorations?: DecoratorMetadata[];
    parameters?: DecoratorMetadata[][];
}

export interface DecoratorMetadata {
    decorator: string;
    ordinal: number;
    target?: Function;
    propertyKey?: string;
    index?: number;
    args: Record<string, any>;
}

export interface DecorationMetadata {
    types: Record<string, TypeDecorationMetadata>;
    decorators: Record<string, TypeDecorationMetadata[]>;
    trace: TypeDecorationMetadata[];
}

export namespace Metadata {

    export const decorations = { types: {}, decorators: {}, trace: [] };

    let ordinal = 0;

    export function stringify(data: any, ident?: number) {
        // TODO: Circular references
        return JSON.stringify(data,
            (key, value) => value instanceof Function ? `[function: ${value.name || "inline"}]` : value, ident);
    }

    export function trace(decorator: string | Function, args: Record<string, any>, over: Object | Function, propertyKey?: string | symbol, index?: number) {
        let name = decorator instanceof Function ? decorator.name : decorator;
        let target = (typeof over === "object" ? over.constructor : over);
        let key = propertyKey && propertyKey.toString();
        let traceInfo = { decorator: name, ordinal: ordinal++, target, key, index, args };
        decorations.trace.push(traceInfo);
        let decInfo = { ordinal: ordinal++, target, key, index, args };
        decorations.decorators[name] = decorations.decorators[name] || [];
        decorations.decorators[name].push(decInfo);
        let typeInfo = { decorator: name, ordinal: traceInfo.ordinal, args };
        let type = decorations.types[target.name] = decorations.types[target.name] || { target, decorations: undefined, properties: undefined };
        if (propertyKey) {
            type.properties = type.properties || {};
            let prop = type.properties[key] = type.properties[propertyKey]
                || { key, decorations: undefined, parameters: undefined };
            if (index !== undefined) {
                prop.parameters = prop.parameters || [];
                prop.parameters[index] = prop.parameters[index] || [];
                prop.parameters[index].push(typeInfo);
            } else {
                prop.decorations = prop.decorations || [];
                prop.decorations.push(typeInfo);
            }
        } else {
            type.decorations = type.decorations || [];
            type.decorations.push(typeInfo);
        }
    }

    export function has(target: Function | Object): boolean {
        return Reflect.hasMetadata(META_TYX_METADATA, target)
            || Reflect.hasMetadata(META_TYX_METADATA, target.constructor);
    }

    export function get(target: Function | Object): Metadata {
        return Reflect.getMetadata(META_TYX_METADATA, target)
            || Reflect.getMetadata(META_TYX_METADATA, target.constructor);
    }

    export function id(target: Function | Object) {
        let meta = get(target);
        return meta && meta.name;
    }

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

