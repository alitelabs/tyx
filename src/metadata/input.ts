import { Class, Context, ResolverArgs, ResolverInfo, ResolverQuery } from '../types/core';
import { EnumMetadata } from './enum';
import { InputType, IVarMetadata, IVarResolution, VarKind, VarMetadata, VarResolution } from './var';

export interface IArgMetadata extends IVarMetadata {
  index: number;
  name: string;
  design: Class;
  defined: boolean;
  build: IVarResolution;
}

export class ArgMetadata implements IArgMetadata {
  public index: number = undefined;
  public name: string = undefined;
  public kind: VarKind = undefined;
  public design: Class = undefined;
  public ref?: Class = undefined;
  public item?: VarMetadata = undefined;
  public build: VarResolution = undefined;
  public defined: boolean = false;

  public static of(def: InputType): ArgMetadata;
  public static of(obj: IArgMetadata): ArgMetadata;
  public static of(defOrObj: IArgMetadata | InputType): ArgMetadata {
    let obj = undefined;
    if (defOrObj === undefined) {
      obj = VarMetadata.of(undefined);
    } else if (defOrObj instanceof Function || defOrObj instanceof EnumMetadata || Array.isArray(defOrObj)) {
      obj = VarMetadata.of(defOrObj as any);
    } else if (defOrObj.kind) {
      obj = defOrObj;
    } else {
      throw new TypeError('Internal metadata error');
    }
    return obj && Object.setPrototypeOf(obj, ArgMetadata.prototype);
  }

  public resolve(
    obj: any,
    args: ResolverQuery & ResolverArgs,
    ctx?: Context,
    info?: ResolverInfo,
  ): any {
    switch (this.kind) {
      case VarKind.Obj: return obj;
      case VarKind.Args: return args;
      case VarKind.Ctx: return ctx;
      case VarKind.Info: return info;
      case VarKind.Void: return undefined;
      default:
        return args[this.name];
    }
  }
}
