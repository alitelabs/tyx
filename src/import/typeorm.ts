// export {
//   Entity,
//   Column,
//   Generated,
//   PrimaryColumn,
//   CreateDateColumn,
//   UpdateDateColumn,
//   VersionColumn,
//   JoinColumn,
//   JoinTable,
//   OneToOne,
//   OneToMany,
//   ManyToOne,
//   ManyToMany,
//   Index,
//   Unique
// } from 'typeorm';

// tslint:disable-next-line:max-line-length
import { ColumnOptions as TypeOrmColumnOptions, Connection as TypeOrmConnection, ConnectionManager as TypeOrmConnectionManager, ConnectionOptions as TypeOrmConnectionOptions, EntityManager as TypeOrmEntityManager, EntityOptions as TypeOrmEntityOptions, IndexOptions as TypeOrmIndexOptions, JoinColumnOptions as TypeOrmJoinColumnOptions, JoinTableOptions as TypeOrmJoinTableOptions, ObjectLiteral, ObjectType, RelationOptions as TypeOrmRelationOptions, Repository as TypeOrmRepository, SelectQueryBuilder as TypeOrmSelectQueryBuilder } from 'typeorm';

// tslint:disable:function-name
export namespace TypeOrm {

  export type ConnectionOptions = TypeOrmConnectionOptions;
  export type EntityOptions = TypeOrmEntityOptions;
  export type ColumnOptions = TypeOrmColumnOptions;
  export type RelationOptions = TypeOrmRelationOptions;
  export type JoinColumnOptions = TypeOrmJoinColumnOptions;
  export type JoinTableOptions = TypeOrmJoinTableOptions;
  // export type JoinTableMultipleColumnsOptions = TypeOrmJoinTableMultipleColumnsOptions;
  export type IndexOptions = TypeOrmIndexOptions;
  export interface ConnectionManager extends TypeOrmConnectionManager { }
  export interface Connection extends TypeOrmConnection { }
  export interface EntityManager extends TypeOrmEntityManager { }
  export interface SelectQueryBuilder<TE> extends TypeOrmSelectQueryBuilder<TE> { }
  export interface Repository<TE extends ObjectLiteral> extends TypeOrmRepository<TE> { }

  let orm: any = undefined;

  function load(req?: boolean): boolean {
    if (!req && orm !== undefined) return !!orm;
    try {
      orm = require('typeorm');
    } catch (err) {
      orm = null;
      if (req) throw err;
    }
    return !!orm;
  }

  function nop(...args: any[]): any { return undefined; }

  export function Entity(options?: EntityOptions): ClassDecorator {
    if (!load()) return nop;
    return orm.Entity(options);
  }

  export function Column(options?: ColumnOptions): PropertyDecorator {
    if (!load()) return nop;
    return orm.Column(options);
  }

  export function Generated(strategy?: 'increment' | 'uuid'): PropertyDecorator {
    if (!load()) return nop;
    return orm.Generated(strategy);
  }

  export function PrimaryColumn(options?: ColumnOptions): PropertyDecorator {
    if (!load()) return nop;
    return orm.PrimaryColumn(options);
  }

  export function CreateDateColumn(options?: ColumnOptions): PropertyDecorator {
    if (!load()) return nop;
    return orm.CreateDateColumn(options);
  }

  export function UpdateDateColumn(options?: ColumnOptions): PropertyDecorator {
    if (!load()) return nop;
    return orm.UpdateDateColumn(options);
  }

  export function VersionColumn(options?: ColumnOptions): PropertyDecorator {
    if (!load()) return nop;
    return orm.VersionColumn(options);
  }

  export function JoinColumn(options?: JoinColumnOptions): PropertyDecorator {
    if (!load()) return nop;
    return orm.JoinColumn(options);
  }

  export function JoinTable(options?: JoinTableOptions): PropertyDecorator {
    if (!load()) return nop;
    return orm.JoinTable(options);
  }

  export function OneToOne<T>(
    typeFunction: (type?: any) => ObjectType<T>,
    inverseSideOrOptions?: ((object: T) => any) | RelationOptions,
    orOptions?: RelationOptions,
  ): PropertyDecorator {
    if (!load()) return nop;
    return orm.OneToOne(typeFunction, inverseSideOrOptions, orOptions);
  }

  export function OneToMany<T>(
    typeFunction: (type?: any) => ObjectType<T>,
    inverseSide: (object: T) => any,
    options?: RelationOptions,
  ): PropertyDecorator {
    if (!load()) return nop;
    return orm.OneToMany(typeFunction, inverseSide, options);
  }

  export function ManyToOne<T>(
    typeFunction: (type?: any) => ObjectType<T>,
    inverseSideOrOptions?: ((object: T) => any) | RelationOptions,
    orOptions?: RelationOptions,
  ): PropertyDecorator {
    if (!load()) return nop;
    return orm.ManyToOne(typeFunction, inverseSideOrOptions, orOptions);
  }

  export function ManyToMany<T>(
    typeFunction: (type?: any) => ObjectType<T>,
    inverseSideOrOptions?: ((object: T) => any) | RelationOptions,
    orOptions?: RelationOptions
  ): PropertyDecorator {
    if (!load()) return nop;
    return orm.ManyToMany(typeFunction, inverseSideOrOptions, orOptions);
  }

  export function Index(
    nameOrFieldsOrOptions?: string | string[] | ((object: any) => (any[] | { [key: string]: number })) | IndexOptions,
    maybeFieldsOrOptions?: ((object?: any) => (any[] | { [key: string]: number })) | IndexOptions | string[] | { synchronize: false },
    maybeOptions?: IndexOptions
  ): ClassDecorator | PropertyDecorator {
    if (!load()) return nop;
    return orm.Index(nameOrFieldsOrOptions, maybeFieldsOrOptions, maybeOptions);
  }
  export function Unique(
    nameOrFields?: string | string[] | ((object: any) => (any[] | { [key: string]: number })),
    maybeFields?: ((object?: any) => (any[] | { [key: string]: number })) | string[]
  ): ClassDecorator | PropertyDecorator {
    if (!load()) return nop;
    return orm.Unique(nameOrFields, maybeFields);
  }

  // XX

  export function createConnection() {
    load(true);

  }

  export function getConnection(name?: string): Connection {
    load(true);
    return orm.getConnection(name);
  }

  export function useContainer() {
    load(true);

  }

  export function getConnectionManager(): ConnectionManager {
    load(true);
    return orm.getConnectionManager();
  }
}
