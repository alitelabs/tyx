import { Orm } from "../import";
import { ColumnMetadata, ColumnMode, ColumnOptions, ColumnType } from "../metadata/column";
import { Metadata } from "../metadata/core";

export function Column(options?: ColumnOptions): PropertyDecorator {
    return (target, propertyKey) => {
        Metadata.trace(Column, { options }, target, propertyKey);
        if (typeof propertyKey !== "string") throw new TypeError("propertyKey must be string");
        options = { nullable: false, ...options };
        let col = Orm.Column(options)(target, propertyKey);
        ColumnMetadata.define(target, propertyKey, ColumnMode.Regular, options);
        return col;
    };
}

export function PrimaryColumn(options?: ColumnOptions): PropertyDecorator {
    return (target, propertyKey) => {
        Metadata.trace(PrimaryColumn, { options }, target, propertyKey);
        if (typeof propertyKey !== "string") throw new TypeError("propertyKey must be string");
        options = { ...options, primary: true, nullable: false };
        let col = Orm.PrimaryColumn(options)(target, propertyKey);
        ColumnMetadata.define(target, propertyKey, ColumnMode.Regular, options);
        return col;
    };
}

export function CreateDateColumn(options?: ColumnOptions): PropertyDecorator {
    return (target, propertyKey) => {
        Metadata.trace(CreateDateColumn, { options }, target, propertyKey);
        if (typeof propertyKey !== "string") throw new TypeError("propertyKey must be string");
        options = { ...options, type: ColumnType.DateTime };
        let col = Orm.CreateDateColumn(options)(target, propertyKey);
        ColumnMetadata.define(target, propertyKey, ColumnMode.CreateDate, options || {});
        return col;
    };
}

export function UpdateDateColumn(options?: ColumnOptions): PropertyDecorator {
    return (target, propertyKey) => {
        Metadata.trace(UpdateDateColumn, { options }, target, propertyKey);
        if (typeof propertyKey !== "string") throw new TypeError("propertyKey must be string");
        options = { ...options, type: ColumnType.DateTime };
        let col = Orm.UpdateDateColumn(options)(target, propertyKey);
        ColumnMetadata.define(target, propertyKey, ColumnMode.CreateDate, options || {});
        return col;
    };
}

export function VersionColumn(options?: ColumnOptions): PropertyDecorator {
    return (target, propertyKey) => {
        Metadata.trace(VersionColumn, { options }, target, propertyKey);
        if (typeof propertyKey !== "string") throw new TypeError("propertyKey must be string");
        if (typeof options === "number") {
            options = { type: ColumnType.BigInt, width: options };
        } else {
            options = { ...options, type: ColumnType.BigInt };
        }
        let col = Orm.VersionColumn(options)(target, propertyKey);
        ColumnMetadata.define(target, propertyKey, ColumnMode.Version, options);
        return col;
    };
}

export function Transient(): PropertyDecorator {
    return (target, propertyKey) => {
        Metadata.trace(Transient, undefined, target, propertyKey);
        // TODO: Register in Schema not in QRM, readOnly
    };
}

export function PrimaryIdColumn(options?: ColumnOptions): PropertyDecorator {
    return PrimaryColumn({ ...options, type: ColumnType.Varchar, length: 36 });
}

export function PrimaryLongColumn(options?: ColumnOptions): PropertyDecorator {
    return PrimaryColumn({ ...options, type: ColumnType.BigInt, primary: true });
}

export function IdColumn(options?: ColumnOptions): PropertyDecorator {
    return Column({ ...options, type: ColumnType.Varchar, length: 36 });
}

export function StringColumn(numOrOptions?: number | ColumnOptions): PropertyDecorator {
    let options: ColumnOptions;
    if (typeof numOrOptions === "number") {
        options = { type: ColumnType.Varchar, length: numOrOptions || 255 };
    } else {
        options = { length: 255, ...numOrOptions, type: ColumnType.Varchar };
    }
    return Column(options);
}

export function TextColumn(options?: ColumnOptions): PropertyDecorator {
    return Column({ ...options, type: ColumnType.MediumText });
}

export function IntColumn(numOrOptions?: number | ColumnOptions): PropertyDecorator {
    let options: ColumnOptions;
    if (typeof numOrOptions === "number") {
        options = { type: ColumnType.Int, width: numOrOptions };
    } else {
        options = { ...numOrOptions, type: ColumnType.Int };
    }
    return Column(options);
}

export function LongColumn(numOrOptions?: number | ColumnOptions): PropertyDecorator {
    let options: ColumnOptions;
    if (typeof numOrOptions === "number") {
        options = { type: ColumnType.BigInt, width: numOrOptions };
    } else {
        options = { ...numOrOptions, type: ColumnType.BigInt };
    }
    return Column(options);
}

export function DoubleColumn(options?: ColumnOptions): PropertyDecorator {
    return Column({ ...options, type: ColumnType.Double });
}

export function BooleanColumn(options?: ColumnOptions): PropertyDecorator {
    return Column({ ...options, type: ColumnType.TinyInt, width: 1 });
}

export function TimestampColumn(options?: ColumnOptions): PropertyDecorator {
    return Column({ ...options, type: ColumnType.DateTime });
}