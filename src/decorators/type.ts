import { TypeMetadata } from "../metadata/type";

export const META_DESIGN_TYPE = "design:type";

export function Input(name?: string): ClassDecorator {
    return (target) => void TypeMetadata.define(target, Input.name, name);
}

export function InputElement(name?: string): ClassDecorator {
    return (target) => void TypeMetadata.define(target, InputElement.name, name);
}

export function Result(name?: string): ClassDecorator {
    return (target) => void TypeMetadata.define(target, Result.name, name);
}

export function ResultElement(name?: string): ClassDecorator {
    return (target) => void TypeMetadata.define(target, ResultElement.name, name);
}

export function Type(name?: string): ClassDecorator {
    return (target) => void TypeMetadata.define(target, Type.name, name);
}

export function Enum(name?: string): ClassDecorator {
    return (target) => void TypeMetadata.define(target, Enum.name, name);
}

/// Fields

export function IDField(req?: boolean): PropertyDecorator {
    return Field(IDField.name, req);
}
export function IntField(req?: boolean): PropertyDecorator {
    return Field(IntField.name, req);
}
export function FloatField(req?: boolean): PropertyDecorator {
    return Field(FloatField.name, req);
}
export function StringField(req?: boolean): PropertyDecorator {
    return Field(StringField.name, req);
}
export function OptionField(req?: boolean): PropertyDecorator {
    return Field(StringField.name, req);
}
export function BooleanField(req?: boolean): PropertyDecorator {
    return Field(BooleanField.name, req);
}
export function DateField(req?: boolean): PropertyDecorator {
    return Field(DateField.name, req);
}
export function EmailField(req?: boolean): PropertyDecorator {
    return Field(EmailField.name, req);
}
export function JSONField(req?: boolean): PropertyDecorator {
    return Field(BooleanField.name, req);
}
export function AnyField(req?: boolean): PropertyDecorator {
    return Field(AnyField.name, req);
}
export function ObjectField(req?: boolean): PropertyDecorator {
    return Field(ObjectField.name, req);
}
export function ListField(req?: boolean): PropertyDecorator {
    return Field(ListField.name, req);
}
export function EnumField(req?: boolean): PropertyDecorator {
    return Field(EnumField.name, req);
}

export function Field(type: string, required?: boolean): PropertyDecorator {
    return (target, propertyKey) => {
        if (typeof propertyKey !== "string") throw new TypeError("propertyKey must be string");
        type = type.replace("Field", "");
        // TODO: use design type when not specified
        Reflect.getMetadata(META_DESIGN_TYPE, target, propertyKey);
        // TODO: Validata
        let meta = TypeMetadata.define(target.constructor);
        meta.fields[propertyKey] = {
            name: propertyKey,
            type,
            required
        };
    };
}