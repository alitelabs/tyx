import { TypeOrm } from '../import';
import { ColumnMetadata, ColumnMode, ColumnOptions, ColumnType } from '../metadata/column';
import { CoreDecorator } from '../metadata/registry';
import { FieldType, Int } from '../metadata/var';
import { Enum } from './type';

// tslint:disable:function-name

export function Generated(strategy?: 'increment' | 'uuid'): PropertyDecorator {
  return CoreDecorator.onProperty(Column, { strategy }, (target, propertyKey) => {
    const col = TypeOrm.Generated(strategy || 'uuid')(target, propertyKey);
    const meta = ColumnMetadata.get(target, propertyKey as string);
    if (!meta) throw new TypeError(`Column decorator must be applied first on ${target.constructor.name}.${propertyKey as string}`);
    meta.setGenerated(strategy);
    return col;
  });
}

export function Column(options?: ColumnOptions): PropertyDecorator {
  return CoreDecorator.onProperty(Column, { options }, (target, propertyKey) => {
    const opts = { nullable: false, ...options };
    const col = TypeOrm.Column(opts)(target, propertyKey);
    ColumnMetadata.define(target, propertyKey as string, ColumnMode.Regular, opts);
    return col;
  });
}

export function PrimaryColumn(options?: ColumnOptions): PropertyDecorator {
  return CoreDecorator.onProperty(PrimaryColumn, { options }, (target, propertyKey) => {
    const opts = { ...options, primary: true, nullable: false };
    const col = TypeOrm.PrimaryColumn(opts)(target, propertyKey);
    ColumnMetadata.define(target, propertyKey as string, ColumnMode.Regular, opts);
    return col;
  });
}

export function CreateDateColumn(options?: ColumnOptions): PropertyDecorator {
  return CoreDecorator.onProperty(CreateDateColumn, { options }, (target, propertyKey) => {
    const opts = { ...options, type: ColumnType.DateTime };
    const col = TypeOrm.CreateDateColumn(opts)(target, propertyKey);
    ColumnMetadata.define(target, propertyKey as string, ColumnMode.CreateDate, opts || {});
    return col;
  });
}

export function UpdateDateColumn(options?: ColumnOptions): PropertyDecorator {
  return CoreDecorator.onProperty(UpdateDateColumn, { options }, (target, propertyKey) => {
    const opts = { ...options, type: ColumnType.DateTime };
    const col = TypeOrm.UpdateDateColumn(opts)(target, propertyKey);
    ColumnMetadata.define(target, propertyKey as string, ColumnMode.CreateDate, opts || {});
    return col;
  });
}

export function VersionColumn(options?: ColumnOptions): PropertyDecorator {
  return CoreDecorator.onProperty(VersionColumn, { options }, (target, propertyKey) => {
    const opts = { ...options, type: ColumnType.BigInt };
    const col = TypeOrm.VersionColumn(opts)(target, propertyKey);
    ColumnMetadata.define(target, propertyKey as string, ColumnMode.Version, opts);
    return col;
  });
}

export function Transient(): PropertyDecorator;
export function Transient(required?: boolean): PropertyDecorator;
export function Transient<T = any>(type: FieldType<T> | 0): PropertyDecorator;
export function Transient<T = any>(type?: FieldType<T> | 0, required?: boolean): PropertyDecorator;
export function Transient<T = any>(typeOrRequired?: FieldType<T> | 0 | boolean, isReq?: boolean): PropertyDecorator {
  let type: FieldType<T> = undefined;
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
  return CoreDecorator.onProperty(Transient, { type, required }, (target, propertyKey) => {
    ColumnMetadata.define(target, propertyKey as string, ColumnMode.Transient, { nullable: !required }, type);
  });
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

export function EnumColumn(type?: Object, options?: ColumnOptions): PropertyDecorator {
  return CoreDecorator.onProperty(Transient, { type, options }, (target, propertyKey) => {
    // tslint:disable-next-line:no-parameter-reassignment
    options = { ...options, enum: type, type: ColumnType.Enum };
    ColumnMetadata.define(target, propertyKey as string, ColumnMode.Regular, options, Enum(type));
    return TypeOrm.Column(options)(target, propertyKey);
  });
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
