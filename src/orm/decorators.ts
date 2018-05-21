import * as Orm from "typeorm";
import { ObjectType } from "../types/common";

export const META_TYX_ENTITIES = "tyx:entities";

export interface EntityOptions extends Orm.EntityOptions { }

export interface ColumnOptions extends Orm.ColumnOptions { }

export interface RelationOptions extends Orm.RelationOptions { }

export interface JoinColumnOptions extends Orm.JoinColumnOptions { }

export function Entity<TFunction extends Function>(database?: TFunction, options?: EntityOptions): ClassDecorator {
    return (target) => {
        if (database) {
            if (!Reflect.hasMetadata(META_TYX_ENTITIES, database)) Reflect.defineMetadata(META_TYX_ENTITIES, [], database);
            Reflect.getMetadata(META_TYX_ENTITIES, database).push(target);
        }
        Orm.Entity(options)(target);
    };
}

export namespace Entity {
    export function list(database: Object): ObjectType<any>[] {
        return Reflect.getMetadata(META_TYX_ENTITIES, database)
            || Reflect.getMetadata(META_TYX_ENTITIES, database.constructor);
    }
}

export function Column(options?: ColumnOptions): PropertyDecorator {
    return Orm.Column(options) as PropertyDecorator;
}

export function PrimaryColumn(options?: ColumnOptions): PropertyDecorator {
    return Orm.PrimaryColumn(options) as PropertyDecorator;
}

export function CreateDateColumn(options?: ColumnOptions): PropertyDecorator {
    return Orm.CreateDateColumn(options) as PropertyDecorator;
}

export function UpdateDateColumn(options?: ColumnOptions): PropertyDecorator {
    return Orm.UpdateDateColumn(options) as PropertyDecorator;
}

export function VersionColumn(options?: ColumnOptions): PropertyDecorator {
    let op: ColumnOptions;
    if (typeof options === "number") {
        op = { type: "bigint", length: options };
    } else if (typeof options === "object") {
        op = { type: "bigint" };
        Object.assign(op, options);
    } else {
        op = { type: "bigint" };
    }
    return Orm.VersionColumn(op) as PropertyDecorator;
}

export function Transient(): PropertyDecorator {
    return function (type: any, propertyKey: string) {
        // DO NOTHING
    };
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

// ================ Drived ================

export function PrimaryIdColumn(options?: ColumnOptions): PropertyDecorator {
    let op: ColumnOptions = { type: "varchar", length: 36 };
    Object.assign(op, options || {});
    return PrimaryColumn(op);
}

export function PrimaryLongColumn(options?: ColumnOptions): PropertyDecorator {
    let op: ColumnOptions = { type: "bigint", length: 18 };
    Object.assign(op, options || {});
    return PrimaryColumn(op);
}

export function IdColumn(options?: ColumnOptions): PropertyDecorator {
    let op: ColumnOptions = { type: "varchar", length: 36 };
    Object.assign(op, options || {});
    return Column(op);
}

export function StringColumn(options?: number | ColumnOptions): PropertyDecorator {
    let op: ColumnOptions;
    if (typeof options === "number") {
        op = { type: "varchar", length: options || 255 };
    } else if (typeof options === "object") {
        op = { type: "varchar" };
        Object.assign(op, options);
    } else {
        op = { type: "varchar" };
    }
    return Column(op);
}

export function TextColumn(options?: ColumnOptions): PropertyDecorator {
    let op: ColumnOptions;
    if (typeof options === "object") {
        op = { type: "mediumtext" };
        Object.assign(op, options);
    } else {
        op = { type: "mediumtext" };
    }
    return Column(op);
}

export function IntColumn(options?: number | ColumnOptions): PropertyDecorator {
    let op: ColumnOptions;
    if (typeof options === "number") {
        op = { type: "int", length: options };
    } else if (typeof options === "object") {
        op = { type: "int" };
        Object.assign(op, options);
    } else {
        op = { type: "int" };
    }
    return Column(op);
}

export function LongColumn(options?: number | ColumnOptions): PropertyDecorator {
    let op: ColumnOptions;
    if (typeof options === "number") {
        op = { type: "bigint", length: options };
    } else if (typeof options === "object") {
        op = { type: "bigint" };
        Object.assign(op, options);
    } else {
        op = { type: "bigint" };
    }
    return Column(op);
}

export function DoubleColumn(options?: ColumnOptions): PropertyDecorator {
    let op: ColumnOptions;
    if (typeof options === "object") {
        op = { type: "double" };
        Object.assign(op, options);
    } else {
        op = { type: "double" };
    }
    return Column(op);
}

export function BooleanColumn(options?: ColumnOptions): PropertyDecorator {
    let op: ColumnOptions = { type: "tinyint", length: 1 };
    if (typeof options === "object") {
        Object.assign(op, options);
    }
    return Column(op);
}

export function TimestampColumn(options?: ColumnOptions): PropertyDecorator {
    let op: ColumnOptions = { type: "datetime" };
    if (typeof options === "object") {
        Object.assign(op, options);
    }
    return Column(op);
}


