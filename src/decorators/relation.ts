import { Orm } from '../import';
import { Metadata } from '../metadata/registry';
// tslint:disable-next-line:max-line-length
import { JoinColumnOptions, JoinTableMultipleColumnsOptions, JoinTableOptions, RelationMetadata, RelationOptions, RelationType } from '../metadata/relation';
import { ObjectType } from '../types/core';

// tslint:disable:function-name

export function OneToMany<T>(
  typeFunction: (type?: any) => ObjectType<T>,
  inverseSide: (object: T) => any,
  options?: RelationOptions,
): PropertyDecorator {
  return (target, propertyKey) => {
    if (typeof propertyKey !== 'string') throw new TypeError('propertyKey must be string');
    return Metadata.trace(OneToMany, target, { typeFunction, inverseSide, options }, propertyKey, void 0, () => {
      const rel = Orm.OneToMany(typeFunction, inverseSide, options)(target, propertyKey);
      RelationMetadata.define(target, propertyKey).commit(RelationType.OneToMany, typeFunction, inverseSide, options);
      return rel;
    });
  };
}

export function ManyToOne<T>(
  typeFunction: (type?: any) => ObjectType<T>,
  options?: RelationOptions,
): PropertyDecorator;
export function ManyToOne<T>(
  typeFunction: (type?: any) => ObjectType<T>,
  inverseSide?: (object: T) => any,
  options?: RelationOptions,
): PropertyDecorator;
export function ManyToOne<T>(
  typeFunction: (type?: any) => ObjectType<T>,
  inverseSideOrOptions?: ((object: T) => any) | RelationOptions,
  orOptions?: RelationOptions,
): PropertyDecorator {
  return (target, propertyKey) => {
    const inverseSide = typeof inverseSideOrOptions === 'function' ? inverseSideOrOptions : undefined;
    const options = typeof inverseSideOrOptions === 'object' ? inverseSideOrOptions : orOptions;
    if (typeof propertyKey !== 'string') throw new TypeError('propertyKey must be string');
    return Metadata.trace(ManyToOne, { typeFunction, inverseSide, options }, target, propertyKey, void 0, () => {
      const rel = Orm.ManyToOne(typeFunction, inverseSide, options)(target, propertyKey);
      RelationMetadata.define(target, propertyKey).commit(RelationType.ManyToOne, typeFunction, inverseSide, options);
      return rel;
    });
  };
}

export function OneToOne<T>(
  typeFunction: (type?: any) => ObjectType<T>,
  options?: RelationOptions,
): PropertyDecorator;
export function OneToOne<T>(
  typeFunction: (type?: any) => ObjectType<T>,
  inverseSide?: (object: T) => any,
  options?: RelationOptions,
): PropertyDecorator;
export function OneToOne<T>(
  typeFunction: (type?: any) => ObjectType<T>,
  inverseSideOrOptions?: ((object: T) => any) | RelationOptions,
  orOptions?: RelationOptions,
): PropertyDecorator {
  return (target, propertyKey) => {
    const inverseSide = typeof inverseSideOrOptions === 'function' ? inverseSideOrOptions : undefined;
    const options = typeof inverseSideOrOptions === 'object' ? inverseSideOrOptions : orOptions;
    if (typeof propertyKey !== 'string') throw new TypeError('propertyKey must be string');
    return Metadata.trace(OneToOne, { typeFunction, inverseSide, options }, target, propertyKey, void 0, () => {
      const rel = Orm.OneToOne(typeFunction, inverseSide, options)(target, propertyKey);
      RelationMetadata.define(target, propertyKey).commit(RelationType.OneToOne, typeFunction, inverseSide, options);
      return rel;
    });
  };
}

export function ManyToMany<T>(
  typeFunction: (type?: any) => ObjectType<T>,
  options?: RelationOptions
): PropertyDecorator;
export function ManyToMany<T>(
  typeFunction: (type?: any) => ObjectType<T>,
  inverseSide?: (object: T) => any,
  options?: RelationOptions
): PropertyDecorator;
export function ManyToMany<T>(
  typeFunction: (type?: any) => ObjectType<T>,
  inverseSideOrOptions?: ((object: T) => any) | RelationOptions,
  orOptions?: RelationOptions
): PropertyDecorator {
  return (target, propertyKey) => {
    const inverseSide = typeof inverseSideOrOptions === 'function' ? inverseSideOrOptions : undefined;
    const options = typeof inverseSideOrOptions === 'object' ? inverseSideOrOptions : orOptions;
    if (typeof propertyKey !== 'string') throw new TypeError('propertyKey must be string');
    return Metadata.trace(ManyToMany, { typeFunction, inverseSide, options }, target, propertyKey, void 0, () => {
      const rel = Orm.ManyToMany(typeFunction, inverseSideOrOptions as any, orOptions)(target, propertyKey);
      RelationMetadata.define(target, propertyKey).commit(RelationType.ManyToMany, typeFunction, inverseSide, options);
      return rel;
    });
  };
}

// export function JoinColumn(): PropertyDecorator;
// export function JoinColumn(name: string): PropertyDecorator;
export function JoinColumn(options: JoinColumnOptions): PropertyDecorator;
// export function JoinColumn(options: JoinColumnOptions[]): PropertyDecorator;
export function JoinColumn(options?: JoinColumnOptions): PropertyDecorator {
  return (target, propertyKey) => {
    if (typeof propertyKey !== 'string') throw new TypeError('propertyKey must be string');
    return Metadata.trace(JoinColumn, { options }, target, propertyKey, void 0, () => {
      const col = Orm.JoinColumn(options)(target, propertyKey);
      RelationMetadata.define(target, propertyKey).addJoinColumn(options);
      return col;
    });
  };
}

/**
 * JoinTable decorator is used in many-to-many relationship to specify owner side of relationship.
 * Its also used to set a custom junction table's name, column names and referenced columns.
 */
export function JoinTable(): PropertyDecorator;

/**
 * JoinTable decorator is used in many-to-many relationship to specify owner side of relationship.
 * Its also used to set a custom junction table's name, column names and referenced columns.
 */
export function JoinTable(options: JoinTableOptions): PropertyDecorator;

/**
 * JoinTable decorator is used in many-to-many relationship to specify owner side of relationship.
 * Its also used to set a custom junction table's name, column names and referenced columns.
 */
export function JoinTable(options: JoinTableMultipleColumnsOptions): PropertyDecorator;

/**
 * JoinTable decorator is used in many-to-many relationship to specify owner side of relationship.
 * Its also used to set a custom junction table's name, column names and referenced columns.
 */
export function JoinTable(options?: JoinTableOptions | JoinTableMultipleColumnsOptions): PropertyDecorator {
  return (target, propertyKey) => {
    if (typeof propertyKey !== 'string') throw new TypeError('propertyKey must be string');
    return Metadata.trace(JoinTable, { options }, target, propertyKey, void 0, () => {
      const col = Orm.JoinTable(options)(target, propertyKey);
      RelationMetadata.define(target, propertyKey).addJoinTable(options);
      return col;
    });
  };
}
