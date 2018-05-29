import { Orm } from "../import";
import { Registry } from "../metadata/registry";
import { JoinColumnOptions, RelationMetadata, RelationOptions, RelationType } from "../metadata/relation";
import { ObjectType } from "../types/core";

export function OneToMany<T>(typeFunction: (type?: any) => ObjectType<T>, inverseSide: (object: T) => any, options?: RelationOptions): PropertyDecorator {
    return (target, propertyKey) => {
        Registry.trace(OneToMany, target, { typeFunction, inverseSide, options }, propertyKey);
        if (typeof propertyKey !== "string") throw new TypeError("propertyKey must be string");
        let rel = Orm.OneToMany(typeFunction, inverseSide, options)(target, propertyKey);
        RelationMetadata.define(target, propertyKey).commit(RelationType.OneToMany, typeFunction, inverseSide, options);
        return rel;
    };
}

export function ManyToOne<T>(typeFunction: (type?: any) => ObjectType<T>, options?: RelationOptions): PropertyDecorator;
export function ManyToOne<T>(typeFunction: (type?: any) => ObjectType<T>, inverseSide?: (object: T) => any, options?: RelationOptions): PropertyDecorator;
export function ManyToOne(typeFunction, inverseSideOrOptions?, orOptions?): PropertyDecorator {
    return (target, propertyKey) => {
        let inverseSide = typeof inverseSideOrOptions === "function" ? inverseSideOrOptions : undefined;
        let options = typeof inverseSideOrOptions === "object" ? inverseSideOrOptions : orOptions;
        Registry.trace(ManyToOne, { inverseSide, options }, target, propertyKey);
        if (typeof propertyKey !== "string") throw new TypeError("propertyKey must be string");
        let rel = Orm.ManyToOne(typeFunction, inverseSideOrOptions, orOptions)(target, propertyKey);
        RelationMetadata.define(target, propertyKey).commit(RelationType.ManyToOne, typeFunction, inverseSide, options);
        return rel;
    };
}

export function OneToOne<T>(typeFunction: (type?: any) => ObjectType<T>, options?: RelationOptions): PropertyDecorator;
export function OneToOne<T>(typeFunction: (type?: any) => ObjectType<T>, inverseSide?: (object: T) => any, options?: RelationOptions): PropertyDecorator;
export function OneToOne(typeFunction, inverseSideOrOptions?, orOptions?): PropertyDecorator {
    return (target, propertyKey) => {
        let inverseSide = typeof inverseSideOrOptions === "function" ? inverseSideOrOptions : undefined;
        let options = typeof inverseSideOrOptions === "object" ? inverseSideOrOptions : orOptions;
        Registry.trace(OneToOne, { inverseSide, options }, target, propertyKey);
        if (typeof propertyKey !== "string") throw new TypeError("propertyKey must be string");
        let rel = Orm.OneToOne(typeFunction, inverseSideOrOptions, orOptions)(target, propertyKey);
        RelationMetadata.define(target, propertyKey).commit(RelationType.OneToOne, typeFunction, inverseSide, options);
        return rel;
    };
}

// export function JoinColumn(): PropertyDecorator;
// export function JoinColumn(name: string): PropertyDecorator;
export function JoinColumn(options: JoinColumnOptions): PropertyDecorator;
// export function JoinColumn(options: JoinColumnOptions[]): PropertyDecorator;
export function JoinColumn(options?): PropertyDecorator {
    return (target, propertyKey) => {
        Registry.trace(JoinColumn, { options }, target, propertyKey);
        if (typeof propertyKey !== "string") throw new TypeError("propertyKey must be string");
        let col = Orm.JoinColumn(options)(target, propertyKey);
        RelationMetadata.define(target, propertyKey).addJoinColumn(options);
        return col;
    };
}

