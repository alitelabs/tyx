import { Class, Prototype } from '../types/core';
import { Utils } from '../utils';
import { ColumnMetadata, IColumnMetadata } from './column';
import { EntityMetadata, IEntityMetadata } from './entity';
import { Metadata } from './registry';
import { IRelationMetadata, RelationMetadata } from './relation';
import { ServiceMetadata } from './service';

export interface IDatabaseMetadata {
  target: Class;
  alias: string;

  targets: Class[];
  entities: IEntityMetadata[];
  columns: IColumnMetadata[];
  relations: IRelationMetadata<any>[];
}

export class DatabaseMetadata implements IDatabaseMetadata {
  public target: Class;
  public alias: string;
  public targets: Class[] = [];

  public entities: EntityMetadata[] = [];
  public columns: ColumnMetadata[] = [];
  public relations: RelationMetadata[] = [];

  protected constructor(target: Class) {
    if (!Utils.isClass(target)) throw new TypeError('Not a class');
    this.target = target;
    this.alias = 'database';
  }

  public static has(target: Class | Prototype): boolean {
    return Reflect.hasMetadata(Metadata.TYX_DATABASE, target)
      || Reflect.hasMetadata(Metadata.TYX_DATABASE, target.constructor);
  }

  public static get(target: Class | Prototype): DatabaseMetadata {
    return Reflect.getMetadata(Metadata.TYX_DATABASE, target)
      || Reflect.getMetadata(Metadata.TYX_DATABASE, target.constructor);
  }

  public static define(target: Class): DatabaseMetadata {
    let meta = this.get(target);
    if (!meta) {
      meta = new DatabaseMetadata(target);
      Reflect.defineMetadata(Metadata.TYX_DATABASE, meta, target);
    }
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
    ServiceMetadata.define(this.target).commit(alias);
    Metadata.DatabaseMetadata[this.alias] = this;
    this.entities.forEach(entity => entity.resolve(this));
    return this;
  }
}
