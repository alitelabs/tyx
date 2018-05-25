import { Orm } from "../import";
import { META_TYX_ENTITIES, Metadata } from "../metadata/common";
import { EntityMetadata, EntityOptions } from "../metadata/entity";
import { ObjectType } from "../types/common";

export function Entity<TFunction extends Function>(group?: TFunction, options?: EntityOptions): ClassDecorator {
    return (target) => {
        Metadata.trace(Entity, { group, options }, target);
        EntityMetadata.define(target, group, options);
        return Orm.Entity(options)(target);
    };
}

export namespace Entity {
    export function list(database: Object): ObjectType<any>[] {
        return Reflect.getMetadata(META_TYX_ENTITIES, database)
            || Reflect.getMetadata(META_TYX_ENTITIES, database.constructor);
    }
}