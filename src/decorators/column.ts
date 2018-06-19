import { Orm } from '../import';
import { ColumnMetadata, ColumnMode, ColumnOptions, ColumnType } from '../metadata/column';
import { Metadata } from '../metadata/registry';
import { Int, VarType } from '../metadata/type';

// tslint:disable:function-name

export function Column(options?: ColumnOptions): PropertyDecorator {
  return (target, propertyKey) => {
    Metadata.trace(Column, { options }, target, propertyKey);
    if (typeof propertyKey !== 'string') throw new TypeError('propertyKey must be string');
    const opts = { nullable: false, ...options };
    const col = Orm.Column(opts)(target, propertyKey);
    ColumnMetadata.define(target, propertyKey, ColumnMode.Regular, opts);
    return col;
  };
}

export function PrimaryColumn(options?: ColumnOptions): PropertyDecorator {
  return (target, propertyKey) => {
    Metadata.trace(PrimaryColumn, { options }, target, propertyKey);
    if (typeof propertyKey !== 'string') throw new TypeError('propertyKey must be string');
    const opts = { ...options, primary: true, nullable: false };
    const col = Orm.PrimaryColumn(opts)(target, propertyKey);
    ColumnMetadata.define(target, propertyKey, ColumnMode.Regular, opts);
    return col;
  };
}

export function CreateDateColumn(options?: ColumnOptions): PropertyDecorator {
  return (target, propertyKey) => {
    Metadata.trace(CreateDateColumn, { options }, target, propertyKey);
    if (typeof propertyKey !== 'string') throw new TypeError('propertyKey must be string');
    const opts = { ...options, type: ColumnType.DateTime };
    const col = Orm.CreateDateColumn(opts)(target, propertyKey);
    ColumnMetadata.define(target, propertyKey, ColumnMode.CreateDate, opts || {});
    return col;
  };
}

export function UpdateDateColumn(options?: ColumnOptions): PropertyDecorator {
  return (target, propertyKey) => {
    Metadata.trace(UpdateDateColumn, { options }, target, propertyKey);
    if (typeof propertyKey !== 'string') throw new TypeError('propertyKey must be string');
    const opts = { ...options, type: ColumnType.DateTime };
    const col = Orm.UpdateDateColumn(opts)(target, propertyKey);
    ColumnMetadata.define(target, propertyKey, ColumnMode.CreateDate, opts || {});
    return col;
  };
}

export function VersionColumn(options?: ColumnOptions): PropertyDecorator {
  return (target, propertyKey) => {
    Metadata.trace(VersionColumn, { options }, target, propertyKey);
    if (typeof propertyKey !== 'string') throw new TypeError('propertyKey must be string');
    const opts = { ...options, type: ColumnType.BigInt };
    const col = Orm.VersionColumn(opts)(target, propertyKey);
    ColumnMetadata.define(target, propertyKey, ColumnMode.Version, opts);
    return col;
  };
}

export function Transient(): PropertyDecorator;
export function Transient(required?: boolean): PropertyDecorator;
export function Transient<T = any>(type: VarType<T> | 0): PropertyDecorator;
export function Transient<T = any>(type?: VarType<T> | 0, required?: boolean): PropertyDecorator;
export function Transient<T = any>(typeOrRequired?: VarType<T> | 0 | boolean, isReq?: boolean): PropertyDecorator {
  return (target, propertyKey) => {
    let type: VarType<T> = undefined;
    let required = false;
    if (typeof typeOrRequired === 'boolean') {
      required = typeOrRequired;
    } else if (typeOrRequired === 0) {
      type = Int;
      required = isReq;
    } else {
      type = typeOrRequired;
      required = isReq;
    }
    Metadata.trace(Transient, { type, required }, target, propertyKey);
    if (typeof propertyKey !== 'string') throw new TypeError('propertyKey must be string');
    ColumnMetadata.define(target, propertyKey, ColumnMode.Transient, { nullable: !required }, type);
  };
}

export function PrimaryIdColumn(options?: ColumnOptions): PropertyDecorator {
  return PrimaryColumn({ length: 36, ...options, type: ColumnType.Varchar });
}

export function PrimaryLongColumn(options?: ColumnOptions): PropertyDecorator {
  return PrimaryColumn({ ...options, type: ColumnType.BigInt, primary: true });
}

export function IdColumn(options?: ColumnOptions): PropertyDecorator {
  return Column({ length: 36, ...options, type: ColumnType.Varchar });
}

export function StringColumn(numOrOptions?: number | ColumnOptions): PropertyDecorator {
  let options: ColumnOptions;
  if (typeof numOrOptions === 'number') {
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
  if (typeof numOrOptions === 'number') {
    options = { type: ColumnType.Int, width: numOrOptions };
  } else {
    options = { ...numOrOptions, type: ColumnType.Int };
  }
  return Column(options);
}

export function LongColumn(numOrOptions?: number | ColumnOptions): PropertyDecorator {
  let options: ColumnOptions;
  if (typeof numOrOptions === 'number') {
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
