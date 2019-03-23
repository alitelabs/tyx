import { Class, Context, ResolverArgs, ResolverInfo, ResolverQuery } from '../types/core';
import { EnumMetadata } from './enum';
import { InputType, IVarMetadata, VarKind, VarMetadata } from './var';

export interface IInputMetadata extends IVarMetadata {
  index: number;
  name: string;
  design: Class;
  defined: boolean;
  build: IVarMetadata;
}

export class InputMetadata implements IInputMetadata {
  public index: number = undefined;
  public name: string = undefined;
  public kind: VarKind = undefined;
  public design: Class = undefined;
  public item?: VarMetadata = undefined;
  public ref?: Class = undefined;
  public build: VarMetadata = undefined;
  public defined: boolean = false;

  public static of(def: InputType): InputMetadata;
  public static of(obj: IInputMetadata): InputMetadata;
  public static of(defOrObj: IInputMetadata | InputType): InputMetadata {
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
    return obj && Object.setPrototypeOf(obj, InputMetadata.prototype);
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
