import { Column, ColumnOptions, PrimaryColumn, VersionColumn } from "typeorm";

export function PrimaryIdColumn(options?: ColumnOptions) {
    let op: ColumnOptions = { type: "varchar", length: 36 };
    Object.assign(op, options || {});
    return PrimaryColumn(op);
}

export function PrimaryLongColumn(options?: ColumnOptions) {
    let op: ColumnOptions = { type: "bigint", length: 18 };
    Object.assign(op, options || {});
    return PrimaryColumn(op);
}

export function IdColumn(options?: ColumnOptions) {
    let op: ColumnOptions = { type: "varchar", length: 36 };
    Object.assign(op, options || {});
    return Column(op);
}

export function StringColumn(options?: number | ColumnOptions) {
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

export function TextColumn(options?: ColumnOptions) {
    let op: ColumnOptions;
    if (typeof options === "object") {
        op = { type: "mediumtext" };
        Object.assign(op, options);
    } else {
        op = { type: "mediumtext" };
    }
    return Column(op);
}

export function IntColumn(options?: number | ColumnOptions) {
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

export function LongColumn(options?: number | ColumnOptions) {
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

export function DoubleColumn(options?: ColumnOptions) {
    let op: ColumnOptions;
    if (typeof options === "object") {
        op = { type: "double" };
        Object.assign(op, options);
    } else {
        op = { type: "double" };
    }
    return Column(op);
}

export function BooleanColumn(options?: ColumnOptions) {
    let op: ColumnOptions = { type: "tinyint", length: 1 };
    if (typeof options === "object") {
        Object.assign(op, options);
    }
    return Column(op);
}

export function TimestampColumn(options?: ColumnOptions) {
    let op: ColumnOptions = { type: "datetime" };
    if (typeof options === "object") {
        Object.assign(op, options);
    }
    return Column(op);
}

export function LongVersionColumn(options?: ColumnOptions) {
    let op: ColumnOptions;
    if (typeof options === "number") {
        op = { type: "bigint", length: options };
    } else if (typeof options === "object") {
        op = { type: "bigint" };
        Object.assign(op, options);
    } else {
        op = { type: "bigint" };
    }
    return VersionColumn(op);
}

export function Transient() {
    return function (type: any, propertyKey: string) {
        // DO NOTHING
    };
}
