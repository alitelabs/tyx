import { Metadata } from '../metadata/registry';
import { GraphKind, TypeMetadata } from '../metadata/type';

// tslint:disable:function-name

export function Schema(name?: string): ClassDecorator {
  return (target) => {
    return Metadata.trace(Schema, { type: GraphKind.Metadata, name }, target, void 0, void 0, () => {
      // tslint:disable-next-line:no-parameter-reassignment
      name = name || target.name.replace(/Schema$/, '');
      return void TypeMetadata.define(target).commit(GraphKind.Metadata, name);
    });
  };
}
Schema.core = true;
