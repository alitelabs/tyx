import { Orm } from "../import";
import { ObjectType } from "../types";
import { ColumnMetadata } from "./column";
import { EntityMetadata } from "./entity";

/**
 * All types that relation can be.
 */
export enum RelationType {
    OneToOne = "one-to-one",
    OneToMany = "one-to-many",
    ManyToOne = "many-to-one",
    ManyToMany = "many-to-many",
}

/**
 * ON_DELETE type to be used to specify delete strategy when some relation is being deleted from the database.
 */
export declare type OnDeleteType = "RESTRICT" | "CASCADE" | "SET NULL" | "DEFAULT" | "NO ACTION";

/**
 * ON_UPDATE type to be used to specify update strategy when some relation is being updated.
 */
export declare type OnUpdateType = "RESTRICT" | "CASCADE" | "SET NULL" | "DEFAULT";

/**
 * Describes all relation's options.
 */
export interface RelationOptions {
    /**
     * Indicates if relation column value can be nullable or not.
     */
    nullable?: boolean;
    /**
     * Database cascade action on delete.
     */
    onDelete?: OnDeleteType;
    /**
     * Database cascade action on update.
     */
    onUpdate?: OnUpdateType;
    /**
     * Indicates if this relation will be a primary key.
     * Can be used only for many-to-one and owner one-to-one relations.
     */
    primary?: boolean;
    /**
     * Set this relation to be lazy. Note: lazy relations are promises. When you call them they return promise
     * which resolve relation result then. If your property's type is Promise then this relation is set to lazy automatically.
     */
    lazy?: boolean;
    /**
     * Set this relation to be eager.
     * Eager relations are always loaded automatically when relation's owner entity is loaded using find* methods.
     * Only using QueryBuilder prevents loading eager relations.
     * Eager flag cannot be set from both sides of relation - you can eager load only one side of the relationship.
     */
    eager?: boolean;
    /**
     * Indicates if persistence is enabled for the relation.
     * By default its enabled, but if you want to avoid any changes in the relation to be reflected in the database you can disable it.
     * If its disabled you can only change a relation from inverse side of a relation or using relation query builder functionality.
     * This is useful for performance optimization since its disabling avoid multiple extra queries during entity save.
     */
    persistence?: boolean;
}

/**
 * Describes join column options.
 */
export interface JoinColumnOptions {
    /**
     * Name of the column.
     */
    name?: string;
    /**
     * Name of the column in the entity to which this column is referenced.
     */
    referencedColumnName?: string;
}

export function OneToMany<T>(typeFunction: (type?: any) => ObjectType<T>, inverseSide: string | ((object: T) => any), options?: RelationOptions): PropertyDecorator {
    return Orm.OneToMany(typeFunction, inverseSide, options) as PropertyDecorator;
}

export function ManyToOne<T>(typeFunction: (type?: any) => ObjectType<T>, options?: RelationOptions): PropertyDecorator;
export function ManyToOne<T>(typeFunction: (type?: any) => ObjectType<T>, inverseSide?: string | ((object: T) => any), options?: RelationOptions): PropertyDecorator;
export function ManyToOne(typeFunction, inverseSideOrOptions?, options?): PropertyDecorator {
    return Orm.ManyToOne(typeFunction, inverseSideOrOptions, options) as PropertyDecorator;
}

export function OneToOne<T>(typeFunction: (type?: any) => ObjectType<T>, options?: RelationOptions): PropertyDecorator;
export function OneToOne<T>(typeFunction: (type?: any) => ObjectType<T>, inverseSide?: string | ((object: T) => any), options?: RelationOptions): PropertyDecorator;
export function OneToOne(typeFunction, inverseSideOrOptions?, options?): PropertyDecorator {
    return Orm.OneToOne(typeFunction, inverseSideOrOptions, options) as PropertyDecorator;
}

export function JoinColumn(): PropertyDecorator;
export function JoinColumn(options: JoinColumnOptions): PropertyDecorator;
export function JoinColumn(options: JoinColumnOptions[]): PropertyDecorator;
export function JoinColumn(options?): PropertyDecorator {
    return Orm.JoinColumn(options) as PropertyDecorator;
}



export interface RelationMetadata {
    /**
     * Entity metadata of the entity where this relation is placed.
     *
     * For example for @ManyToMany(type => Category) in Post, entityMetadata will be metadata of Post entity.
     */
    // entityMetadata: EntityMetadata;
    /**
     * Relation type, e.g. is it one-to-one, one-to-many, many-to-one or many-to-many.
     */
    relationType: RelationType;
    /**
     * Target's property name to which relation decorator is applied.
     */
    propertyName: string;
    /**
     * Entity metadata of the entity that is targeted by this relation.
     *
     * For example for @ManyToMany(type => Category) in Post, inverseEntityMetadata will be metadata of Category entity.
     */
    inverseEntityMetadata: EntityMetadata;
    /**
     * Gets the relation metadata of the inverse side of this relation.
     */
    inverseRelation?: RelationMetadata;
    /**
     * Join table columns.
     * Join columns can be obtained only from owner side of the relation.
     * From non-owner side of the relation join columns will be empty.
     * If this relation is a many-to-one/one-to-one then it takes join columns from the current entity.
     * If this relation is many-to-many then it takes all owner join columns from the junction entity.
     */
    joinColumns: ColumnMetadata[];
}