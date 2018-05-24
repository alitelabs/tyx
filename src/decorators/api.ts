import { ApiMetadata } from "../metadata/api";

export function Api(name?: string): ClassDecorator {
    return (target) => void ApiMetadata.define(target, name);
}