import { ApiMetadata } from "../metadata/api";

export function Api(name?: string): ClassDecorator {
    return (target) => {
        let meta = ApiMetadata.define(target, name);
        Object.values(meta.authMetadata).forEach(item => item.api = meta.name);
        Object.values(meta.inputMetadata).forEach(item => item.api = meta.name);
        Object.values(meta.resultMetadata).forEach(item => item.api = meta.name);
        Object.values(meta.resolverMetadata).forEach(item => item.api = meta.name);
        Object.values(meta.httpMetadata).forEach(item => item.api = meta.name);
        Object.values(meta.eventMetadata).forEach(item => item.forEach(h => h.api = meta.name));
    };
}