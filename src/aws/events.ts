import { Event, Internal } from "../metadata";
import { EventAdapter } from "../types";

export function S3Event(bucket: string, action?: string, filter?: string, adapter?: EventAdapter) {
    return Event("aws:s3", bucket, action, filter, adapter, Internal);
}

export function S3ObjectCreated(bucket: string, filter?: string, adapter?: EventAdapter) {
    return Event("aws:s3", bucket, "ObjectCreated:*", filter, adapter, Internal);
}

export function DynamoDbInsert(database: string, adapter?: EventAdapter) {
    return Event("aws:dynamodb", database, "INSERT", null, adapter, Internal);
}

export function DynamoDbModify(database: string, adapter?: EventAdapter) {
    return Event("aws:dynamodb", database, "MODIFY", null, adapter, Internal);
}

export function DynamoDbRemove(database: string, adapter?: EventAdapter) {
    return Event("aws:dynamodb", database, "REMOVE", null, adapter, Internal);
}

export function Schedule(action?: string, adapter?: EventAdapter) {
    return Event("aws:cloudwatch", "events", action, null, adapter, Internal);
}
