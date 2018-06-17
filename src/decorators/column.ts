import { Orm } from '../import';
import { ColumnMetadata, ColumnMode, ColumnOptions, ColumnType } from '../metadata/column';
import { EntityMetadata } from '../metadata/entity';
import { Registry } from '../metadata/registry';
import { VarType } from '../metadata/type';

// tslint:disable:function-name

export function Column(options?: ColumnOptions): PropertyDecorator {
  return (target, propertyKey) => {
    Registry.trace(Column, { options }, target, propertyKey);
    if (typeof propertyKey !== 'string') throw new TypeError('propertyKey must be string');
    const opts = { nullable: false, ...options };
    const col = Orm.Column(opts)(target, propertyKey);
    ColumnMetadata.define(target, propertyKey, ColumnMode.Regular, opts);
    return col;
  };
}

export function PrimaryColumn(options?: ColumnOptions): PropertyDecorator {
  return (target, propertyKey) => {
    Registry.trace(PrimaryColumn, { options }, target, propertyKey);
    if (typeof propertyKey !== 'string') throw new TypeError('propertyKey must be string');
    const opts = { ...options, primary: true, nullable: false };
    const col = Orm.PrimaryColumn(opts)(target, propertyKey);
    ColumnMetadata.define(target, propertyKey, ColumnMode.Regular, opts);
    return col;
  };
}

export function CreateDateColumn(options?: ColumnOptions): PropertyDecorator {
  return (target, propertyKey) => {
    Registry.trace(CreateDateColumn, { options }, target, propertyKey);
    if (typeof propertyKey !== 'string') throw new TypeError('propertyKey must be string');
    const opts = { ...options, type: ColumnType.DateTime };
    const col = Orm.CreateDateColumn(opts)(target, propertyKey);
    ColumnMetadata.define(target, propertyKey, ColumnMode.CreateDate, opts || {});
    return col;
  };
}

export function UpdateDateColumn(options?: ColumnOptions): PropertyDecorator {
  return (target, propertyKey) => {
    Registry.trace(UpdateDateColumn, { options }, target, propertyKey);
    if (typeof propertyKey !== 'string') throw new TypeError('propertyKey must be string');
    const opts = { ...options, type: ColumnType.DateTime };
    const col = Orm.UpdateDateColumn(opts)(target, propertyKey);
    ColumnMetadata.define(target, propertyKey, ColumnMode.CreateDate, opts || {});
    return col;
  };
}

export function VersionColumn(options?: ColumnOptions): PropertyDecorator {
  return (target, propertyKey) => {
    Registry.trace(VersionColumn, { options }, target, propertyKey);
    if (typeof propertyKey !== 'string') throw new TypeError('propertyKey must be string');
    const opts = { ...options, type: ColumnType.BigInt };
    const col = Orm.VersionColumn(opts)(target, propertyKey);
    ColumnMetadata.define(target, propertyKey, ColumnMode.Version, opts);
    return col;
  };
}

export function Transient<T = any>(type: VarType<T>, required?: boolean): PropertyDecorator {
  return (target, propertyKey) => {
    Registry.trace(Transient, undefined, target, propertyKey);
    if (typeof propertyKey !== 'string') throw new TypeError('propertyKey must be string');
    EntityMetadata.define(target.constructor).addField(propertyKey, type, required);
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
