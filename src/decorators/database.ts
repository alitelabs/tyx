import { Di, Orm } from '../import';
import { DatabaseMetadata } from '../metadata/database';
import { EntityMetadata } from '../metadata/entity';
import { Metadata } from '../metadata/registry';
import { Class } from '../types/core';

// tslint:disable-next-line:variable-name
export const Database = 'Database';

export interface Database {
  manager: Orm.EntityManager;
  metadata: EntityMetadata[];
}

// tslint:disable:function-name

export function DatabaseService(entities: Class[]): ClassDecorator;
export function DatabaseService(alias: string, entities: Class[]): ClassDecorator;
export function DatabaseService(aliasOrEntities: string | Class[], second?: Class[]): ClassDecorator {
  const alias = typeof aliasOrEntities === 'string' ? aliasOrEntities : 'database';
  const entities = Array.isArray(aliasOrEntities) ? aliasOrEntities : second;
  return Metadata.onClass(DatabaseService, { alias, entities }, (target) => {
    DatabaseMetadata.define(target).commit(alias, entities);
    return Di.Service(alias)(target);
  });
}
