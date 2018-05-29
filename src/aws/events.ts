import { Event } from "../decorators/event";
import { EventAdapter } from "../types/event";

export function S3Event(bucket: string, action?: string, filter?: string, adapter?: EventAdapter) {
    return Event("aws:s3", bucket, action, filter, adapter);
}

export function S3ObjectCreated(bucket: string, filter?: string, adapter?: EventAdapter) {
    return Event("aws:s3", bucket, "ObjectCreated:*", filter, adapter);
}

export function DynamoDbInsert(database: string, adapter?: EventAdapter) {
    return Event("aws:dynamodb", database, "INSERT", null, adapter);
}

export function DynamoDbModify(database: string, adapter?: EventAdapter) {
    return Event("aws:dynamodb", database, "MODIFY", null, adapter);
}

export function DynamoDbRemove(database: string, adapter?: EventAdapter) {
    return Event("aws:dynamodb", database, "REMOVE", null, adapter);
}

export function Schedule(action?: string, adapter?: EventAdapter) {
    return Event("aws:cloudwatch", "events", action, null, adapter);
}
