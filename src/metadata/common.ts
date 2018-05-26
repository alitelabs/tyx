
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

export interface InjectMetadata {
    resource: string;
    application: string;
    target?: Function;
}

export interface Metadata {
    target: Function;
    name: string;
    dependencies: Record<string, InjectMetadata>;
}

export class Metadata implements Metadata {

    public static decorations = { types: {}, decorators: {}, trace: [] };
    private static ordinal = 0;

    public target: Function;
    public name: string;
    public dependencies: Record<string, InjectMetadata> = undefined;

    protected constructor(target: Function, name?: string) {
        this.target = target;
        this.name = name || target.name;
    }

    public static id(target: Function | Object): string {
        let meta = this.get(target);
        return meta && meta.name;
    }

    public static has(target: Function | Object): boolean {
        return Reflect.hasMetadata(META_TYX_METADATA, target)
            || Reflect.hasMetadata(META_TYX_METADATA, target.constructor);
    }

    public static get(target: Function | Object): Metadata {
        return Reflect.getMetadata(META_TYX_METADATA, target)
            || Reflect.getMetadata(META_TYX_METADATA, target.constructor);
    }

    public static define(target: Function, name?: string): Metadata {
        let meta = this.get(target);
        if (!meta) {
            meta = new Metadata(target, name);
            Reflect.defineMetadata(META_TYX_METADATA, meta, target);
        }
        meta.name = name || target.name;
        return meta;
    }

    public static trace(decorator: string | Function, args: Record<string, any>, over: Object | Function, propertyKey?: string | symbol, index?: number) {
        let name = decorator instanceof Function ? decorator.name : decorator;
        let target = (typeof over === "object" ? over.constructor : over);
        let key = propertyKey && propertyKey.toString();
        let traceInfo = { decorator: name, ordinal: this.ordinal++, target, key, index, args };
        this.decorations.trace.push(traceInfo);
        let decInfo = { ordinal: this.ordinal++, target, key, index, args };
        this.decorations.decorators[name] = this.decorations.decorators[name] || [];
        this.decorations.decorators[name].push(decInfo);
        let typeInfo = { decorator: name, ordinal: traceInfo.ordinal, args };
        let type = this.decorations.types[target.name] = this.decorations.types[target.name] || { target, decorations: undefined, properties: undefined };
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

    public static stringify(data: any, ident?: number) {
        // TODO: Circular references
        return JSON.stringify(data,
            (key, value) => value instanceof Function ? `[function: ${value.name || "inline"}]` : value, ident);
    }

    public inject(propertyKey: string, resource?: string | Function, application?: string) {
        if (!resource) {
            resource = Reflect.getMetadata(META_DESIGN_TYPE, this.target.prototype, propertyKey);
        }
        let target: Function;
        if (resource instanceof Function) {
            target = resource;
            resource = resource.name;
        } else {
            target = undefined;
            resource = resource.toString();
        }
        this.dependencies = this.dependencies || {};
        this.dependencies[propertyKey] = { resource, target, application };
    }
}

