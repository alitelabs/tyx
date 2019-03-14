import { Orm } from '../import';
import { IndexOptions } from '../metadata/indexes';
import { Metadata } from '../metadata/registry';

// tslint:disable:function-name

/**
 * Creates a database index.
 * Can be used on entity property or on entity.
 * Can create indices with composite columns when used on entity.
 */
export function Index(
  options?: IndexOptions
): ClassDecorator & PropertyDecorator;

/**
 * Creates a database index.
 * Can be used on entity property or on entity.
 * Can create indices with composite columns when used on entity.
 */
export function Index(
  name: string,
  options?: IndexOptions
): ClassDecorator & PropertyDecorator;

/**
 * Creates a database index.
 * Can be used on entity property or on entity.
 * Can create indices with composite columns when used on entity.
 */
export function Index(
  name: string,
  options: { synchronize: false }
): ClassDecorator & PropertyDecorator;

/**
 * Creates a database index.
 * Can be used on entity property or on entity.
 * Can create indices with composite columns when used on entity.
 */
export function Index(
  name: string, fields: string[],
  options?: IndexOptions
): ClassDecorator & PropertyDecorator;

/**
 * Creates a database index.
 * Can be used on entity property or on entity.
 * Can create indices with composite columns when used on entity.
 */
export function Index(
  fields: string[],
  options?: IndexOptions
): ClassDecorator & PropertyDecorator;

/**
 * Creates a database index.
 * Can be used on entity property or on entity.
 * Can create indices with composite columns when used on entity.
 */
export function Index(
  fields: (object?: any) => (any[] | { [key: string]: number }),
  options?: IndexOptions
): ClassDecorator & PropertyDecorator;

/**
 * Creates a database index.
 * Can be used on entity property or on entity.
 * Can create indices with composite columns when used on entity.
 */
export function Index(
  name: string,
  fields: (object?: any) => (any[] | { [key: string]: number }),
  options?: IndexOptions
): ClassDecorator & PropertyDecorator;

/**
 * Creates a database index.
 * Can be used on entity property or on entity.
 * Can create indices with composite columns when used on entity.
 */
export function Index(
  nameOrFieldsOrOptions?: string | string[] | ((object: any) => (any[] | { [key: string]: number })) | IndexOptions,
  maybeFieldsOrOptions?: ((object?: any) => (any[] | { [key: string]: number })) | IndexOptions | string[] | { synchronize: false },
  maybeOptions?: IndexOptions
): ClassDecorator | PropertyDecorator {
  // normalize parameters
  const name = typeof nameOrFieldsOrOptions === 'string' ? nameOrFieldsOrOptions : undefined;
  const fields = typeof nameOrFieldsOrOptions === 'string'
    ? <((object?: any) => (any[] | { [key: string]: number })) | string[]>maybeFieldsOrOptions
    : nameOrFieldsOrOptions as string[];
  let options = (typeof nameOrFieldsOrOptions === 'object' && !Array.isArray(nameOrFieldsOrOptions))
    ? nameOrFieldsOrOptions as IndexOptions
    : maybeOptions;
  if (!options) {
    options = (typeof maybeFieldsOrOptions === 'object' && !Array.isArray(maybeFieldsOrOptions))
      ? maybeFieldsOrOptions as IndexOptions
      : maybeOptions;
  }
  return Metadata.onClassOrProperty(Index, { name, fields, options }, (target: any, propertyKey?: any) => {
    // TODO: EntityMetadata.define(target).addIndex(options);
    return Orm.Index(nameOrFieldsOrOptions as any, maybeFieldsOrOptions as any, maybeOptions)(target, propertyKey);
  });
}

/**
 * Composite unique constraint must be set on entity classes and must specify entity's fields to be unique.
 */
export function Unique(
  name: string,
  fields: string[]
): ClassDecorator & PropertyDecorator;

/**
 * Composite unique constraint must be set on entity classes and must specify entity's fields to be unique.
 */
export function Unique(
  fields: string[]
): ClassDecorator & PropertyDecorator;

/**
 * Composite unique constraint must be set on entity classes and must specify entity's fields to be unique.
 */
export function Unique(
  fields: (object?: any) => (any[] | { [key: string]: number })
): ClassDecorator & PropertyDecorator;

/**
 * Composite unique constraint must be set on entity classes and must specify entity's fields to be unique.
 */
export function Unique(
  name: string,
  fields: (object?: any) => (any[] | { [key: string]: number })
): ClassDecorator & PropertyDecorator;

/**
 * Composite unique constraint must be set on entity classes and must specify entity's fields to be unique.
 */
export function Unique(
  nameOrFields?: string | string[] | ((object: any) => (any[] | { [key: string]: number })),
  maybeFields?: ((object?: any) => (any[] | { [key: string]: number })) | string[]
): ClassDecorator | PropertyDecorator {
  const name = typeof nameOrFields === 'string'
    ? nameOrFields
    : undefined;
  const fields = typeof nameOrFields === 'string'
    ? <((object?: any) => (any[] | { [key: string]: number })) | string[]>maybeFields
    : nameOrFields as string[];

  // const target = propertyKey ? clsOrObject.constructor : clsOrObject as Function;
  return Metadata.onClassOrProperty(Unique, { name, fields }, (target, propertyKey) => {
    // TODO: EntityMetadata.define(target).addUnique(options);
    return Orm.Unique(nameOrFields as any, maybeFields as any)(target, propertyKey);
  });
}
