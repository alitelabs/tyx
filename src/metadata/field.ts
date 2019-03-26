import { Class } from '../types/core';
import { IVarMetadata, VarKind, VarMetadata } from './var';

export type IDesignMetadata = {
  name?: string;
  type: string;
  target: Function;
};

export interface IFieldMetadata extends IVarMetadata {
  name: string;
  mandatory: boolean;
  design: IDesignMetadata;
  build: IVarMetadata;
}

export abstract class FieldMetadata /* extends VarMetadata */ implements IFieldMetadata {
  public kind: VarKind = undefined;
  public name: string = undefined;
  public mandatory: boolean = undefined;
  public item?: VarMetadata = undefined;
  public ref?: Class = undefined;
  public design: IDesignMetadata = undefined;
  public build: VarMetadata = undefined;

  public static on(obj: IFieldMetadata): FieldMetadata {
    return obj && Object.setPrototypeOf(obj, FieldMetadata.prototype);
  }
}
