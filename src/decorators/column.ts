import { Orm } from "../import";
import { ColumnOptions, ColumnType } from "../metadata/column";
import { Metadata } from "../metadata/common";

export function Column(options?: ColumnOptions): PropertyDecorator {
    return (target, propertyKey) => {
        Metadata.trace(Column, { options }, target, propertyKey);
        return Orm.Column(options)(target, propertyKey);
    };
}

export function PrimaryColumn(options?: ColumnOptions): PropertyDecorator {
    return (target, propertyKey) => {
        Metadata.trace(PrimaryColumn, { options }, target, propertyKey);
        return Orm.PrimaryColumn(options)(target, propertyKey);
    };
}

export function CreateDateColumn(options?: ColumnOptions): PropertyDecorator {
    return (target, propertyKey) => {
        Metadata.trace(CreateDateColumn, { options }, target, propertyKey);
        return Orm.CreateDateColumn(options)(target, propertyKey);
    };
}

export function UpdateDateColumn(options?: ColumnOptions): PropertyDecorator {
    return (target, propertyKey) => {
        Metadata.trace(UpdateDateColumn, { options }, target, propertyKey);
        return Orm.UpdateDateColumn(options)(target, propertyKey);
    };
}

export function VersionColumn(options?: ColumnOptions): PropertyDecorator {
    if (typeof options === "number") {
        options = { type: ColumnType.BigInt, width: options };
    } else if (typeof options === "object") {
        options = { ...options, type: ColumnType.BigInt };
    } else {
        options = { type: ColumnType.BigInt };
    }
    return (target, propertyKey) => {
        Metadata.trace(VersionColumn, { options }, target, propertyKey);
        return Orm.VersionColumn(options)(target, propertyKey);
    };
}

export function Transient(): PropertyDecorator {
    return (target, propertyKey) => {
        Metadata.trace(Transient, undefined, target, propertyKey);
    };
}

export function PrimaryIdColumn(options?: ColumnOptions): PropertyDecorator {
    let op: ColumnOptions = { ...options, type: ColumnType.Varchar, length: 36, primary: true };
    return PrimaryColumn(op);
}

export function PrimaryLongColumn(options?: ColumnOptions): PropertyDecorator {
    let op: ColumnOptions = {
        ...options, type: ColumnType.BigInt, primary: true
    };
    return PrimaryColumn(op);
}

export function IdColumn(options?: ColumnOptions): PropertyDecorator {
    let op: ColumnOptions = { type: ColumnType.Varchar, length: 36 };
    Object.assign(op, options || {});
    return Column(op);
}

export function StringColumn(options?: number | ColumnOptions): PropertyDecorator {
    let op: ColumnOptions;
    if (typeof options === "number") {
        op = { type: ColumnType.Varchar, length: options || 255 };
    } else if (typeof options === "object") {
        op = { ...options, type: ColumnType.Varchar };
    } else {
        op = { type: ColumnType.Varchar };
    }
    return Column(op);
}

export function TextColumn(options?: ColumnOptions): PropertyDecorator {
    let op: ColumnOptions;
    if (typeof options === "object") {
        op = { ...options, type: ColumnType.MediumText };
    } else {
        op = { type: ColumnType.MediumText };
    }
    return Column(op);
}

export function IntColumn(options?: number | ColumnOptions): PropertyDecorator {
    let op: ColumnOptions;
    if (typeof options === "number") {
        op = { type: ColumnType.Int, width: options };
    } else if (typeof options === "object") {
        op = { ...options, type: ColumnType.Int };
    } else {
        op = { type: ColumnType.Int };
    }
    return Column(op);
}

export function LongColumn(options?: number | ColumnOptions): PropertyDecorator {
    let op: ColumnOptions;
    if (typeof options === "number") {
        op = { type: ColumnType.BigInt, width: options };
    } else if (typeof options === "object") {
        op = { ...options, type: ColumnType.BigInt };
    } else {
        op = { type: ColumnType.BigInt };
    }
    return Column(op);
}

export function DoubleColumn(options?: ColumnOptions): PropertyDecorator {
    let op: ColumnOptions;
    if (typeof options === "object") {
        op = { ...options, type: ColumnType.Double };
    } else {
        op = { type: ColumnType.Double };
    }
    return Column(op);
}

export function BooleanColumn(options?: ColumnOptions): PropertyDecorator {
    let op: ColumnOptions = { type: ColumnType.TinyInt, width: 1 };
    if (typeof options === "object") op = { ...options, ...op };
    return Column(op);
}

export function TimestampColumn(options?: ColumnOptions): PropertyDecorator {
    let op: ColumnOptions = { type: ColumnType.Datetime };
    if (typeof options === "object") op = { ...options, ...op };
    return Column(op);
}