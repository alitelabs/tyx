import { ApiMetadata } from "../metadata/api";
import { Metadata } from "../metadata/core";

export function Api(name?: string): ClassDecorator {
    return (target) => {
        Metadata.trace(Api, { name }, target);
        ApiMetadata.define(target).commit(name);
    };
}