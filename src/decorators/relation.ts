import { TypeOrm } from '../import';
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
  return Metadata.onProperty(OneToMany, { typeFunction, inverseSide, options }, (target, propertyKey) => {
    const rel = TypeOrm.OneToMany(typeFunction, inverseSide, options)(target, propertyKey);
    RelationMetadata.define(target, propertyKey as string).commit(RelationType.OneToMany, typeFunction, inverseSide, options);
    return rel;
  });
}

export function ManyToOne<T>(
  typeFunction: (type?: any) => ObjectType<T>,
  options?: RelationOptions
): PropertyDecorator;
export function ManyToOne<T>(
  typeFunction: (type?: any) => ObjectType<T>,
  inverseSide?: (object: T) => any,
  options?: RelationOptions
): PropertyDecorator;
export function ManyToOne<T>(
  typeFunction: (type?: any) => ObjectType<T>,
  inverseSideOrOptions?: ((object: T) => any) | RelationOptions,
  orOptions?: RelationOptions
): PropertyDecorator {
  const inverseSide = typeof inverseSideOrOptions === 'function' ? inverseSideOrOptions : undefined;
  const options = typeof inverseSideOrOptions === 'object' ? inverseSideOrOptions : orOptions;
  return Metadata.onProperty(ManyToOne, { typeFunction, inverseSide, options }, (target, propertyKey) => {
    const rel = TypeOrm.ManyToOne(typeFunction, inverseSide, options)(target, propertyKey);
    RelationMetadata.define(target, propertyKey as string).commit(RelationType.ManyToOne, typeFunction, inverseSide, options);
    return rel;
  });
}

export function OneToOne<T>(
  typeFunction: (type?: any) => ObjectType<T>,
  options?: RelationOptions,
): PropertyDecorator;
export function OneToOne<T>(
  typeFunction: (type?: any) => ObjectType<T>,
  inverseSide?: (object: T) => any,
  options?: RelationOptions
): PropertyDecorator;
export function OneToOne<T>(
  typeFunction: (type?: any) => ObjectType<T>,
  inverseSideOrOptions?: ((object: T) => any) | RelationOptions,
  orOptions?: RelationOptions,
): PropertyDecorator {
  const inverseSide = typeof inverseSideOrOptions === 'function' ? inverseSideOrOptions : undefined;
  const options = typeof inverseSideOrOptions === 'object' ? inverseSideOrOptions : orOptions;
  return Metadata.onProperty(OneToOne, { typeFunction, inverseSide, options }, (target, propertyKey) => {
    const rel = TypeOrm.OneToOne(typeFunction, inverseSide, options)(target, propertyKey);
    RelationMetadata.define(target, propertyKey as string).commit(RelationType.OneToOne, typeFunction, inverseSide, options);
    return rel;
  });
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
  const inverseSide = typeof inverseSideOrOptions === 'function' ? inverseSideOrOptions : undefined;
  const options = typeof inverseSideOrOptions === 'object' ? inverseSideOrOptions : orOptions;
  return Metadata.onProperty(ManyToMany, { typeFunction, inverseSide, options }, (target, propertyKey) => {
    const rel = TypeOrm.ManyToMany(typeFunction, inverseSideOrOptions as any, orOptions)(target, propertyKey);
    RelationMetadata.define(target, propertyKey as string).commit(RelationType.ManyToMany, typeFunction, inverseSide, options);
    return rel;
  });
}

// export function JoinColumn(): PropertyDecorator;
// export function JoinColumn(name: string): PropertyDecorator;
export function JoinColumn(options: JoinColumnOptions): PropertyDecorator;
// export function JoinColumn(options: JoinColumnOptions[]): PropertyDecorator;
export function JoinColumn(options?: JoinColumnOptions): PropertyDecorator {
  return Metadata.onProperty(JoinColumn, { options }, (target, propertyKey) => {
    const col = TypeOrm.JoinColumn(options)(target, propertyKey);
    RelationMetadata.define(target, propertyKey as string).addJoinColumn(options);
    return col;
  });
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
export function JoinTable(options?: JoinTableOptions & JoinTableMultipleColumnsOptions): PropertyDecorator {
  return Metadata.onProperty(JoinTable, { options }, (target, propertyKey) => {
    const col = TypeOrm.JoinTable(options)(target, propertyKey);
    RelationMetadata.define(target, propertyKey as string).addJoinTable(options);
    return col;
  });
}
