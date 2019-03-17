import { TypeOrm } from '../import';
import { EntityMetadata, EntityOptions } from '../metadata/entity';
import { Metadata } from '../metadata/registry';

// tslint:disable-next-line:function-name
export function Entity(options?: EntityOptions): ClassDecorator {
  return Metadata.onClass(Entity, { options }, (target) => {
    EntityMetadata.define(target).submit(options);
    return TypeOrm.Entity(options)(target);
  });
}
