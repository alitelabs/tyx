import { Di } from '../import';
import { DatabaseMetadata } from '../metadata/database';
import { CoreDecorator } from '../metadata/registry';
import { Class } from '../types/core';

// tslint:disable-next-line:variable-name
export const Database = 'Database';

export interface Database {
  metadata: DatabaseMetadata;
}

// tslint:disable:function-name

export function DatabaseService(entities: Class[]): ClassDecorator;
export function DatabaseService(alias: string, entities: Class[]): ClassDecorator;
export function DatabaseService(aliasOrEntities: string | Class[], second?: Class[]): ClassDecorator {
  const alias = typeof aliasOrEntities === 'string' ? aliasOrEntities : 'database';
  const entities = Array.isArray(aliasOrEntities) ? aliasOrEntities : second;
  return CoreDecorator.onClass(DatabaseService, { alias, entities }, (target) => {
    const meta = DatabaseMetadata.define(target).commit(alias, entities);
    return Di.Service(meta.alias)(target);
  });
}
