import { Class, Prototype } from "../types";
import { Metadata } from "./core";
import { EntityMetadata } from "./entity";
import { ServiceMetadata } from "./service";

export interface DatabaseMetadata extends ServiceMetadata {
    target: Class;
    alias: string;

    targets: Class[];
    entities: EntityMetadata[];
}

export class DatabaseMetadata implements DatabaseMetadata {
    public targets: Class[] = [];
    public entities: EntityMetadata[] = [];

    protected constructor(target: Class) {
        this.target = target;
        this.alias = "database";
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
        for (let target of entities) {
            let meta = EntityMetadata.get(target);
            if (!meta) throw new TypeError(`Type [${target.name}] missing @Entity decoration`);
            this.targets.push(target);
            this.entities.push(meta);
        }
        // TODO: Link entity metadata
        ServiceMetadata.define(this.target).commit(alias);
        return this;
    }
}