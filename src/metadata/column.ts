import { Orm } from "../import";
import { GraphType } from "./type";

export enum ColumnType {
    Int = "int",
    TinyInt = "tinyint",
    SmallInt = "smallint",
    MediumInt = "mediumint",
    BigInt = "bigint",

    Float = "float",
    Double = "double",
    Decimal = "decimal",
    Numeric = "numeric",

    Date = "date",
    Datetime = "datetime",
    Timestamp = "timestamp",
    Time = "time",
    Year = "year",

    Char = "char",
    Varchar = "varchar",
    Nvarchar = "nvarchar",
    Text = "text",
    TinyText = "tinytext",
    MediumText = "mediumtext",
    LongText = "longtext",

    // Enum = "enum",
    // Json = "json",
    // Blob = "blob",
    // TinyBlob = "tinyblob",
    // MediumBlob = "mediumblob",
    // LongBlob = "longblob",
    // Binary = "binary",
    // VarBinary = "varbinary",
    // "geometry",
    // "point",
    // "linestring",
    // "polygon",
    // "multipoint",
    // "multilinestring",
    // "multipolygon",
    // "geometrycollection"
}

// ID: The ID scalar type represents a unique identifier
// Int: A signed 32‐bit integer.
// Float: A signed double-precision floating-point value.
// String: A UTF‐8 character sequence.
// Boolean: true or false.
export namespace ColumnType {
    export function graphType(type: ColumnType) {
        switch (type) {
            case ColumnType.Int:
            case ColumnType.TinyInt:
            case ColumnType.SmallInt:
            case ColumnType.MediumInt:
            case ColumnType.BigInt:
                return GraphType.Int;
            case ColumnType.Float:
            case ColumnType.Double:
            case ColumnType.Decimal:
            case ColumnType.Numeric:
                return GraphType.Float;
            case ColumnType.Date:
            case ColumnType.Datetime:
            case ColumnType.Timestamp:
            case ColumnType.Time:
            case ColumnType.Year:
                return GraphType.Date;
            case ColumnType.Char:
            case ColumnType.Varchar:
            case ColumnType.Nvarchar:
            case ColumnType.Text:
            case ColumnType.TinyText:
            case ColumnType.MediumText:
            case ColumnType.LongText:
                return GraphType.String;
            // case ColumnType.Enum:
            //     return GraphType.Enum;
            // case ColumnType.Json:
            //     return GraphType.Object;
            // case ColumnType.Blob:
            // case ColumnType.TinyBlob:
            // case ColumnType.MediumBlob:
            // case ColumnType.LongBlob:
            // case ColumnType.Binary:
            // case ColumnType.VarBinary:
            //     return GraphType.ANY;
            default:
                throw new TypeError(`Unknown ColumnType: [${type}]`);
        }
    }
}

export interface ColumnOptions {
    /**
     * Column type. Must be one of the value from the ColumnTypes class.
     */
    type?: ColumnType;
    /**
     * Column name in the database.
     */
    name?: string;
    /**
     * Column type's length. Used only on some column types.
     * For example type = "string" and length = "100" means that ORM will create a column with type varchar(100).
     */
    length?: string | number;
    /**
     * Column type's display width. Used only on some column types in MySQL.
     * For example, INT(4) specifies an INT with a display width of four digits.
     */
    width?: number;
    /**
     * Indicates if column's value can be set to NULL.
     */
    nullable?: boolean;
    /**
     * Indicates if column value is not updated by "save" operation.
     * It means you'll be able to write this value only when you first time insert the object.
     * Default value is "false".
     */
    readonly?: boolean;
    /**
     * Indicates if column is always selected by QueryBuilder and find operations.
     * Default value is "true".
     */
    select?: boolean;
    /**
     * Default database value.
     */
    default?: any;
    /**
     * ON UPDATE trigger. Works only for MySQL.
     */
    // onUpdate?: string;
    /**
     * Indicates if this column is a primary key.
     * Same can be achieved when @PrimaryColumn decorator is used.
     */
    primary?: boolean;
    /**
     * Specifies if column's value must be unique or not.
     */
    unique?: boolean;
    /**
     * Column comment. Not supported by all database types.
     */
    comment?: string;
    /**
     * The precision for a decimal (exact numeric) column (applies only for decimal column), which is the maximum
     * number of digits that are stored for the values.
     */
    precision?: number | null;
    /**
     * The scale for a decimal (exact numeric) column (applies only for decimal column), which represents the number
     * of digits to the right of the decimal point and must not be greater than precision.
     */
    scale?: number;
    /**
     * Puts ZEROFILL attribute on to numeric column. Works only for MySQL.
     * If you specify ZEROFILL for a numeric column, MySQL automatically adds the UNSIGNED attribute to this column
     */
    // zerofill?: boolean;
    /**
     * Puts UNSIGNED attribute on to numeric column. Works only for MySQL.
     */
    // unsigned?: boolean;
    /**
     * Defines a column character set.
     * Not supported by all database types.
     */
    // charset?: string;
    /**
     * Defines a column collation.
     */
    // collation?: string;
    /**
     * Array of possible enumerated values.
     */
    enum?: any[] | Object;
    /**
     * Generated column expression. Supports only in MySQL.
     */
    // asExpression?: string;
    /**
     * Generated column type. Supports only in MySQL.
     */
    // generatedType?: "VIRTUAL" | "STORED";
    /**
     * Indicates if this column is an array.
     * Can be simply set to true or array length can be specified.
     * Supported only by postgres.
     */
    // array?: boolean;
    /**
     * Specifies a value transformer that is to be used to (un)marshal
     * this column when reading or writing to the database.
     */
    // transformer?: ValueTransformer;
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
        op = { type: ColumnType.BigInt, width: options };
    } else if (typeof options === "object") {
        op = { ...options, type: ColumnType.BigInt };
    } else {
        op = { type: ColumnType.BigInt };
    }
    return Orm.VersionColumn(op) as PropertyDecorator;
}

export function Transient(): PropertyDecorator {
    return function (type: any, propertyKey: string) {
        // DO NOTHING
    };
}

export function PrimaryIdColumn(options?: ColumnOptions): PropertyDecorator {
    let op: ColumnOptions = { ...options, type: ColumnType.Varchar, length: 36 };
    return PrimaryColumn(op);
}

export function PrimaryLongColumn(options?: ColumnOptions): PropertyDecorator {
    let op: ColumnOptions = { ...options, type: ColumnType.BigInt };
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


export interface ColumnMetadata {
    /**
     * Class's property name on which this column is applied.
     */
    propertyName: string;
    /**
     * The database type of the column.
     */
    type: ColumnType;
    /**
     * The precision for a decimal (exact numeric) column (applies only for decimal column),
     * which is the maximum number of digits that are stored for the values.
     */
    precision?: number | null;
    /**
     * The scale for a decimal (exact numeric) column (applies only for decimal column),
     * which represents the number of digits to the right of the decimal point and must not be greater than precision.
     */
    scale?: number;
    /**
     * Type's length in the database.
     */
    length: string;
    /**
     * Indicates if this column is a primary key.
     */
    isPrimary: boolean;
    /**
     * Indicates if this column is generated (auto increment or generated other way).
     */
    isGenerated: boolean;
    /**
     * Indicates if column can contain nulls or not.
     */
    isNullable: boolean;
}