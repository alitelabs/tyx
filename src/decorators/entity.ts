import { Orm } from '../import';
import { EntityMetadata, EntityOptions } from '../metadata/entity';
import { Metadata } from '../metadata/registry';

// tslint:disable-next-line:function-name
export function Entity(options?: EntityOptions): ClassDecorator {
  return (target) => {
    Metadata.trace(Entity, { options }, target);
    EntityMetadata.define(target).submit(options);
    return Orm.Entity(options)(target);
  };
}
