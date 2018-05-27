import { Orm } from "../import";
import { Metadata } from "../metadata/core";
import { JoinColumnOptions, RelationOptions } from "../metadata/relation";
import { ObjectType } from "../types";

export function OneToMany<T>(typeFunction: (type?: any) => ObjectType<T>, inverseSide: string | ((object: T) => any), options?: RelationOptions): PropertyDecorator {
    return (target, propertyKey) => {
        Metadata.trace(OneToMany, target, { typeFunction, inverseSide, options }, propertyKey);
        return Orm.OneToMany(typeFunction, inverseSide, options)(target, propertyKey);
    };
}

export function ManyToOne<T>(typeFunction: (type?: any) => ObjectType<T>, options?: RelationOptions): PropertyDecorator;
export function ManyToOne<T>(typeFunction: (type?: any) => ObjectType<T>, inverseSide?: string | ((object: T) => any), options?: RelationOptions): PropertyDecorator;
export function ManyToOne(typeFunction, inverseSideOrOptions?, orOptions?): PropertyDecorator {
    return (target, propertyKey) => {
        let inverseSide = typeof inverseSideOrOptions === "function" ? inverseSideOrOptions : undefined;
        let options = typeof inverseSideOrOptions === "object" ? inverseSideOrOptions : orOptions;
        Metadata.trace(ManyToOne, { inverseSide, options }, target, propertyKey);
        return Orm.ManyToOne(typeFunction, inverseSideOrOptions, orOptions)(target, propertyKey);
    };
}

export function OneToOne<T>(typeFunction: (type?: any) => ObjectType<T>, options?: RelationOptions): PropertyDecorator;
export function OneToOne<T>(typeFunction: (type?: any) => ObjectType<T>, inverseSide?: string | ((object: T) => any), options?: RelationOptions): PropertyDecorator;
export function OneToOne(typeFunction, inverseSideOrOptions?, orOptions?): PropertyDecorator {
    return (target, propertyKey) => {
        let inverseSide = typeof inverseSideOrOptions === "function" ? inverseSideOrOptions : undefined;
        let options = typeof inverseSideOrOptions === "object" ? inverseSideOrOptions : orOptions;
        Metadata.trace(OneToOne, { inverseSide, options }, target, propertyKey);
        return Orm.OneToOne(typeFunction, inverseSideOrOptions, orOptions)(target, propertyKey);
    };
}

export function JoinColumn(): PropertyDecorator;
export function JoinColumn(options: JoinColumnOptions): PropertyDecorator;
export function JoinColumn(options: JoinColumnOptions[]): PropertyDecorator;
export function JoinColumn(options?): PropertyDecorator {
    return (target, propertyKey) => {
        Metadata.trace(JoinColumn, { options }, target, propertyKey);
        return Orm.JoinColumn(options)(target, propertyKey);
    };
}

