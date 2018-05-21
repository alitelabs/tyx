// export const META_REM = "tyx:rem";
export const META_DESIGN_TYPE = "design:type";
export const META_GRAPHQL_KIND = "design:kind";
export const META_GRAPHQL_FIELDS = "graphql:fields";
export const META_GRAPHQL_NAME = "graphql:name";
export const META_GRAPHQL_TYPE = "graphql:type";
export const META_GRAPHQL_REQUIRED = "graphql:required";

export function Input(name?: string): ClassDecorator {
    return (target) => {
        Reflect.defineMetadata(META_GRAPHQL_KIND, "input", target);
        Reflect.defineMetadata(META_GRAPHQL_NAME, name || target.name, target);
    };
}

export function Result(name?: string): ClassDecorator {
    return (target) => {
        Reflect.defineMetadata(META_GRAPHQL_KIND, "result", target);
        Reflect.defineMetadata(META_GRAPHQL_NAME, name || target.name, target);
    };
}

export function Type(name?: string): ClassDecorator {
    return (target) => {
        Reflect.defineMetadata(META_GRAPHQL_KIND, "type", target);
        Reflect.defineMetadata(META_GRAPHQL_NAME, name || target.name, target);
    };
}

export function Enum(name?: string): ClassDecorator {
    return (target) => {
        Reflect.defineMetadata(META_GRAPHQL_KIND, "enum", target);
        Reflect.defineMetadata(META_GRAPHQL_NAME, name || target.name, target);
    };
}

export function Field(type?: string, req?: boolean): PropertyDecorator {
    return (target, propertyKey) => {
        // Reflect.defineMetadata(META_REM, rem || `Field ${propertyKey}`, target, propertyKey);
        if (!Reflect.hasMetadata(META_GRAPHQL_FIELDS, target)) Reflect.defineMetadata(META_GRAPHQL_FIELDS, [], target);
        Reflect.getMetadata(META_GRAPHQL_FIELDS, target).push(propertyKey);

        Reflect.getMetadata(META_DESIGN_TYPE, target, propertyKey);
        // TODO: Check desing type against input type
        Reflect.defineMetadata(META_GRAPHQL_TYPE, type, target, propertyKey);
        Reflect.defineMetadata(META_GRAPHQL_REQUIRED, !!req, target, propertyKey);
    };
}

export namespace Field {
    export function ID(req?: boolean): PropertyDecorator {
        return Field(ID.name, req);
    }
    export function Int(req?: boolean): PropertyDecorator {
        return Field(Int.name, req);
    }
    export function Float(req?: boolean): PropertyDecorator {
        return Field(Float.name, req);
    }
    export function String(req?: boolean): PropertyDecorator {
        return Field(String.name, req);
    }
    export function Boolean(req?: boolean): PropertyDecorator {
        return Field(Boolean.name, req);
    }
    export function Date(req?: boolean): PropertyDecorator {
        return Field(Date.name, req);
    }
    export function Email(req?: boolean): PropertyDecorator {
        return Field(Email.name, req);
    }
    export function JSON(req?: boolean): PropertyDecorator {
        return Field(Boolean.name, req);
    }
    export function Any(req?: boolean): PropertyDecorator {
        return Field(Any.name, req);
    }
    export function Object(req?: boolean): PropertyDecorator {
        return Field(Object.name, req);
    }
    export function List(req?: boolean): PropertyDecorator {
        return Field(List.name, req);
    }
    export function EnumField(req?: boolean): PropertyDecorator {
        return Field(Enum.name, req);
    }
}