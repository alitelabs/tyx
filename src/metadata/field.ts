import { Class } from '../types/core';
import { IVarMetadata, IVarResolution, VarKind, VarMetadata, VarResolution } from './var';

export type IDesignMetadata = {
  name?: string;
  type: string;
  target: Function;
};

export interface IFieldMetadata extends IVarMetadata {
  name: string;
  mandatory: boolean;
  design: IDesignMetadata;
  build: IVarResolution;
}

export abstract class FieldMetadata implements IFieldMetadata {
  public kind: VarKind = undefined;
  public name: string = undefined;
  public mandatory: boolean = undefined;
  public ref?: Class = undefined;
  public item?: VarMetadata = undefined;
  public design: IDesignMetadata = undefined;
  public build: VarResolution = undefined;

  public static on(obj: IFieldMetadata): FieldMetadata {
    return obj && Object.setPrototypeOf(obj, FieldMetadata.prototype);
  }
}
