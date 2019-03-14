import { Orm } from '../import';
import { EntityMetadata, EntityOptions } from '../metadata/entity';
import { Metadata } from '../metadata/registry';

// tslint:disable-next-line:function-name
export function Entity(options?: EntityOptions): ClassDecorator {
  return (target) => {
    return Metadata.trace(Entity, { options }, target, void 0, void 0, () => {
      EntityMetadata.define(target).submit(options);
      return Orm.Entity(options)(target);
    });
  };
}
