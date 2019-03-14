import { Metadata } from '../metadata/registry';
import { GraphKind, TypeMetadata } from '../metadata/type';

// tslint:disable:function-name

export function Schema(name?: string): ClassDecorator {
  return Metadata.onClass(Schema, { type: GraphKind.Metadata, name }, (target) => {
    return void TypeMetadata.define(target).commit(GraphKind.Metadata, name);
  });
}
Schema.core = true;
