import { Class, Prototype } from '../types/core';
import { Utils } from '../utils';
import { ColumnMetadata, IColumnMetadata } from './column';
import { EntityMetadata, IEntityMetadata } from './entity';
import { MetadataRegistry, Registry } from './registry';
import { IRelationMetadata, RelationMetadata } from './relation';
import { IServiceMetadata, ServiceMetadata } from './service';

export interface IDatabaseMetadata {
  target: Class;
  alias: string;
  servicer: IServiceMetadata;

  targets: Class[];
  entities: IEntityMetadata[];
  columns: IColumnMetadata[];
  relations: IRelationMetadata<any>[];
}

export class DatabaseMetadata implements IDatabaseMetadata {
  public target: Class;
  public name: string;
  public alias: string;
  public servicer: ServiceMetadata;

  public targets: Class[] = [];
  public entities: EntityMetadata[] = [];
  public columns: ColumnMetadata[] = [];
  public relations: RelationMetadata[] = [];

  protected constructor(target: Class) {
    if (!Utils.isClass(target)) throw new TypeError('Not a class');
    this.target = target;
    this.name = target.name;
    this.alias = 'database';
  }

  public static has(target: Class | Prototype): boolean {
    return Reflect.hasOwnMetadata(MetadataRegistry.TYX_DATABASE, target)
      || Reflect.hasOwnMetadata(MetadataRegistry.TYX_DATABASE, target.constructor);
  }

  public static get(target: Class | Prototype): DatabaseMetadata {
    return Reflect.getOwnMetadata(MetadataRegistry.TYX_DATABASE, target)
      || Reflect.getOwnMetadata(MetadataRegistry.TYX_DATABASE, target.constructor);
  }

  public static define(target: Class): DatabaseMetadata {
    if (!Utils.isClass(target)) throw new TypeError('Not a class');
    let meta = this.get(target);
    if (meta) return meta;
    meta = new DatabaseMetadata(target);
    Reflect.defineMetadata(MetadataRegistry.TYX_DATABASE, meta, target);
    return meta;
  }

  public commit(alias?: string, entities?: Class[]): this {
    this.alias = alias || this.target.name;
    for (const target of entities) {
      const meta = EntityMetadata.get(target);
      if (!meta) throw new TypeError(`Type [${target.name}] missing @Entity decoration`);
      this.targets.push(target);
      this.entities.push(meta);
    }
    this.servicer = ServiceMetadata.define(this.target).commit(alias, null, true);
    Registry.DatabaseMetadata[this.name] = this;
    this.entities.forEach(entity => entity.resolve(this));
    return this;
  }
}
