import { Metadata } from "./registry";
import { IVarMetadata, VarKind } from "./var";

export interface IEnumMetadata extends IVarMetadata {
  name: string;
  ref: Function;
  options: string[];
  item?: never;
  build?: never;
}

export class EnumMetadata implements IEnumMetadata {
  public kind = VarKind.Enum;
  public name: string;
  public ref: Function;
  public options: string[];
  public item?: never;
  public build?: never;

  constructor(target: Object, name: string) {
    // super(VarKind.Enum, name);
    if (!name) throw new TypeError('Unnamed enum');
    this.name = name;
    this.ref = () => target;
    this.options = [];
    for (const key in target) {
      if (Number.isInteger(+key)) continue;
      this.options.push(key);
    }
  }

  public static has(target: Object): boolean {
    return Reflect.hasOwnMetadata(Metadata.TYX_ENUM, target);
  }

  public static get(target: Object): EnumMetadata {
    return Reflect.getOwnMetadata(Metadata.TYX_ENUM, target);
  }

  public static define(target: Object, name?: string): EnumMetadata {
    let meta = this.get(target);
    if (!meta) {
      meta = new EnumMetadata(target, name);
      Reflect.defineMetadata(Metadata.TYX_ENUM, meta, target);
      if (Metadata.Entity[name]) throw new TypeError(`Duplicate enum name: ${name}`);
      Metadata.Enum[name] = meta;
    } else if (name && name !== meta.name) {
      throw new TypeError(`Can not rename enum from: ${meta.name} to: ${name}`);
    }
    return meta;
  }
}
