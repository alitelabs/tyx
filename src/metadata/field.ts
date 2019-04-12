import { Class } from '../types/core';
import { IVarMetadata, IVarResolution, VarKind, VarMetadata, VarResolution, VarRole } from './var';

export type IDesignMetadata = {
  name?: string;
  type: string;
  target: Function;
};

export interface IFieldMetadata extends IVarMetadata {
  role: VarRole;
  name: string;
  mandatory: boolean;
  design: IDesignMetadata;
  res: IVarResolution;
}

export abstract class FieldMetadata implements IFieldMetadata {
  public kind: VarKind = undefined;
  public name: string = undefined;
  public role: VarRole = undefined;
  public mandatory: boolean = undefined;
  public ref?: Class = undefined;
  public item?: VarMetadata = undefined;
  public design: IDesignMetadata = undefined;
  public res: VarResolution = undefined;

  public static on(obj: IFieldMetadata): FieldMetadata {
    return obj && Object.setPrototypeOf(obj, FieldMetadata.prototype);
  }
}
