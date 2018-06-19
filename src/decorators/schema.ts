import { Registry } from '../metadata/registry';
import { GraphKind, TypeMetadata } from '../metadata/type';

// tslint:disable:function-name

export function Metadata(name?: string): ClassDecorator {
  return (target) => {
    Registry.trace(Metadata, { type: GraphKind.Metadata, name }, target);
    // tslint:disable-next-line:no-parameter-reassignment
    name = name || target.name.replace(/Schema$/, '');
    return void TypeMetadata.define(target).commit(GraphKind.Metadata, name);
  };
}
