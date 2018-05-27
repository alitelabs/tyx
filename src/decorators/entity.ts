import { Orm } from "../import";
import { Metadata } from "../metadata/core";
import { EntityMetadata, EntityOptions } from "../metadata/entity";

export function Entity(options?: EntityOptions): ClassDecorator {
    return (target) => {
        Metadata.trace(Entity, { options }, target);
        EntityMetadata.define(target).commit(options);
        return Orm.Entity(options)(target);
    };
}
