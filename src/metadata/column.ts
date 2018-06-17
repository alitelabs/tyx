import { Class, Prototype } from '../types/core';
import { DatabaseMetadata } from './database';
import { EntityMetadata, IEntityMetadata } from './entity';
import { Registry } from './registry';
import { FieldMetadata, GraphKind } from './type';

export enum ColumnType {
  Int = 'int',
  TinyInt = 'tinyint',
  SmallInt = 'smallint',
  MediumInt = 'mediumint',
  BigInt = 'bigint',

  Float = 'float',
  Double = 'double',
  Decimal = 'decimal',
  Numeric = 'numeric',

  Date = 'date',
  DateTime = 'datetime',
  Timestamp = 'timestamp',
  Time = 'time',
  Year = 'year',

  Char = 'char',
  Varchar = 'varchar',
  Nvarchar = 'nvarchar',
  Text = 'text',
  TinyText = 'tinytext',
  MediumText = 'mediumtext',
  LongText = 'longtext',

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
        return GraphKind.Int;
      case ColumnType.Float:
      case ColumnType.Double:
      case ColumnType.Decimal:
      case ColumnType.Numeric:
        return GraphKind.Float;
      case ColumnType.Date:
      case ColumnType.DateTime:
      case ColumnType.Timestamp:
      case ColumnType.Time:
      case ColumnType.Year:
        return GraphKind.Date;
      case ColumnType.Char:
      case ColumnType.Varchar:
      case ColumnType.Nvarchar:
      case ColumnType.Text:
      case ColumnType.TinyText:
      case ColumnType.MediumText:
      case ColumnType.LongText:
        return GraphKind.String;
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

/**
* Kinda type of the column. Not a type in the database, but locally used type to
* determine what kind of column we are working with.
* For example, "primary" means that it will be a primary column, or "createDate"
* means that it will create a create date column.
*/
export enum ColumnMode {
  Regular = 'regular',
  Virtual = 'virtual',
  CreateDate = 'createDate',
  UpdateDate = 'updateDate',
  Version = 'version',
  Transient = 'transient',
  // "treeChildrenCount"
  // "treeLevel"
  // "objectId"
  // "array"
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
   * For example type = "string" and length = "100" means that
   * ORM will create a column with type varchar(100).
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
   * The precision for a decimal (exact numeric) column (applies only for decimal column),
   * which is the maximum number of digits that are stored for the values.
   */
  precision?: number | null;
  /**
   * The scale for a decimal (exact numeric) column (applies only for decimal column),
   * which represents the number of digits to the right of the decimal point
   * and must not be greater than precision.
   */
  scale?: number;
  /**
   * Puts ZEROFILL attribute on to numeric column. Works only for MySQL.
   * If you specify ZEROFILL for a numeric column, MySQL automatically adds
   * the UNSIGNED attribute to this column
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

export interface IColumnMetadata extends FieldMetadata {
  /**
   * Target class where column decorator is used.
   * This may not be always equal to entity metadata (for example embeds or inheritance cases).
   */
  target: Class;
  /**
   * Entity metadata where this column metadata is.
   *
   * For example for @Column() name: string in Post, entityMetadata will be metadata of Post entity.
   */
  entityMetadata: IEntityMetadata;
  /**
   * Class's property name on which this column is applied.
   */
  name: string;
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
   * which represents the number of digits to the right of the decimal point and must
   * not be greater than precision.
   */
  scale?: number;
  /**
   * Type's length in the database.
   */
  length: string;
  /**
   * Type's display width in the database.
   */
  width?: number;
  /**
   * Column comment.
   * This feature is not supported by all databases.
   */
  comment: string;
  /**
   * Indicates if this column is a primary key.
   */
  isPrimary: boolean;
  /**
   * Indicates if column can contain nulls or not.
   */
  isNullable: boolean;
  /**
   * Indicates if this column is generated (auto increment or generated other way).
   */
  isGenerated: boolean;
  /**
   * Indicates if this column contains an entity creation date.
   */
  isCreateDate: boolean;
  /**
   * Indicates if this column contains an entity update date.
   */
  isUpdateDate: boolean;
  /**
   * Indicates if this column contains an entity version.
   */
  isVersion: boolean;
  /**
   * Indicates if column is virtual. Virtual columns are not mapped to the entity.
   */
  isVirtual: boolean;
}

export class ColumnMetadata extends FieldMetadata implements IColumnMetadata {
  public target: Class;
  public entityMetadata: IEntityMetadata;
  public name: string;
  public propertyName: string;
  public type: ColumnType;
  public precision?: number | null;
  public scale?: number;
  public length: string;
  public width?: number;
  public comment: string;
  public isPrimary: boolean;
  public isNullable: boolean;
  public isGenerated: boolean;
  public isCreateDate: boolean;
  public isUpdateDate: boolean;
  public isVersion: boolean;
  public isVirtual: boolean;

  protected constructor(
    target: Class,
    propertyKey: string,
    mode: ColumnMode, options: ColumnOptions,
  ) {
    super();
    const state: IColumnMetadata = {
      kind: ColumnType.graphType(options.type),
      target,
      name: propertyKey,
      required: options.primary || !options.nullable,
      design: undefined,
      build: undefined,

      entityMetadata: undefined,
      // TODO: Database name
      propertyName: propertyKey,
      type: options.type,
      comment: options.comment,
      precision: options.precision,
      scale: options.scale,
      length: options.length ? '' + options.length : null,
      width: options.width,
      isPrimary: options.primary,
      isNullable: !options.primary && options.nullable,
      isGenerated: false, // options.generated;
      isCreateDate: mode === ColumnMode.CreateDate,
      isUpdateDate: mode === ColumnMode.UpdateDate,
      isVersion: mode === ColumnMode.Version,
      isVirtual: mode === ColumnMode.Virtual,
    };
    Object.assign(this, state);
  }

  public static has(target: Prototype, propertyKey: string): boolean {
    return Reflect.hasMetadata(Registry.TYX_COLUMN, target, propertyKey);
  }

  public static get(target: Prototype, propertyKey: string): ColumnMetadata {
    return Reflect.getMetadata(Registry.TYX_COLUMN, target, propertyKey);
  }

  public static define(
    target: Prototype,
    propertyKey: string,
    mode: ColumnMode,
    options: ColumnOptions,
  ): ColumnMetadata {
    let meta = this.get(target, propertyKey);
    if (!meta) {
      meta = new ColumnMetadata(target.constructor, propertyKey, mode, options);
      Reflect.defineMetadata(Registry.TYX_MEMBER, meta, target, propertyKey);
      Reflect.defineMetadata(Registry.TYX_COLUMN, meta, target, propertyKey);
    }
    EntityMetadata.define(target.constructor).addColumn(meta);
    return meta;
  }

  public commit(): void {
    const design = Reflect.getMetadata(Registry.DESIGN_TYPE, this.target.prototype, this.propertyName);
    this.design = design && { type: design.name, target: design };
  }

  public resolve(database: DatabaseMetadata, entity: EntityMetadata): void {
    this.entityMetadata = entity;
    const key = `${entity.name}.${this.propertyName}`;
    Registry.ColumnMetadata[key] = this;
    database.columns.push(this);
  }
}
