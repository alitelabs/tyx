import { Class } from '../types/core';
import { EnumMetadata } from './enum';
import { IVarMetadata, IVarResolution, ResultType, VarKind, VarMetadata, VarResolution } from './var';

export interface IResultMetadata extends IVarMetadata {
  design: Class;
  promise: boolean;
  defined: boolean;
  res: IVarResolution;
}

export class ResultMetadata implements IResultMetadata {
  public kind: VarKind = VarKind.Type;
  public design: Class = undefined;
  public promise: boolean = undefined;
  public ref?: Class = undefined;
  public item?: VarMetadata = undefined;
  public res: VarResolution = undefined;
  public defined: boolean = false;

  public static of(def: ResultType): ResultMetadata;
  public static of(obj: IResultMetadata): ResultMetadata;
  public static of(defOrObj: IResultMetadata | ResultType): ResultMetadata {
    let obj = undefined;
    if (defOrObj === undefined) {
      obj = VarMetadata.of(undefined);
    } else if (defOrObj instanceof Function || defOrObj instanceof EnumMetadata || Array.isArray(defOrObj)) {
      obj = VarMetadata.of(defOrObj);
    } else if (defOrObj.kind) {
      obj = defOrObj;
    } else {
      throw new TypeError('Internal metadata error');
    }
    return obj && Object.setPrototypeOf(obj, ResultMetadata.prototype);
  }
}
