import { CoreDecorator } from '../metadata/registry';
import { TypeMetadata } from '../metadata/type';
import { VarKind } from '../metadata/var';

// tslint:disable:function-name

export function Schema(name?: string): ClassDecorator {
  return CoreDecorator.onClass(Schema, { type: VarKind.Metadata, name }, (target) => {
    return void TypeMetadata.define(target).commit(VarKind.Metadata, name);
  });
}
Schema.core = true;
