import { ServiceMetadata } from "../metadata";

export function Export() {
    return function (type: Object, propertyKey: string, descriptor: PropertyDescriptor) {
        let metadata = ServiceMetadata.get(type);
        metadata.remoteMetadata[propertyKey] = { service: undefined, method: propertyKey };
    };
}