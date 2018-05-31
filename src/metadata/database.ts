import { Class, Prototype } from "../types/core";
import { EntityMetadata } from "./entity";
import { Registry } from "./registry";
import { ServiceMetadata } from "./service";

export interface DatabaseMetadata extends ServiceMetadata {
    target: Class;
    serviceId: string;

    targets: Class[];
    entities: EntityMetadata[];
}

export class DatabaseMetadata implements DatabaseMetadata {
    public targets: Class[] = [];
    public entities: EntityMetadata[] = [];

    protected constructor(target: Class) {
        this.target = target;
        this.serviceId = "database";
    }

    public static has(target: Class | Prototype): boolean {
        return Reflect.hasMetadata(Registry.TYX_DATABASE, target)
            || Reflect.hasMetadata(Registry.TYX_DATABASE, target.constructor);
    }

    public static get(target: Class | Prototype): DatabaseMetadata {
        return Reflect.getMetadata(Registry.TYX_DATABASE, target)
            || Reflect.getMetadata(Registry.TYX_DATABASE, target.constructor);
    }

    public static define(target: Class): DatabaseMetadata {
        let meta = this.get(target);
        if (!meta) {
            meta = new DatabaseMetadata(target);
            Reflect.defineMetadata(Registry.TYX_DATABASE, meta, target);
        }
        return meta;
    }

    public commit(alias?: string, entities?: Class[]): this {
        this.serviceId = alias || this.target.name;
        for (let target of entities) {
            let meta = EntityMetadata.get(target);
            if (!meta) throw new TypeError(`Type [${target.name}] missing @Entity decoration`);
            this.targets.push(target);
            this.entities.push(meta);
        }
        // TODO: Link entity metadata
        ServiceMetadata.define(this.target).commit(alias);
        this.entities.forEach(entity => entity.resolve(this));
        return this;
    }
}