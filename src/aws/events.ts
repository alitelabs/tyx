import { Event } from '../decorators/event';

// tslint:disable:function-name

export function S3Event(bucket: string, action?: string, filter?: string) {
  return Event('aws:s3', bucket, action, filter);
}

export function S3ObjectCreated(bucket: string, filter?: string) {
  return Event('aws:s3', bucket, 'ObjectCreated:*', filter);
}

export function SQSMessageReceived(queue: string) {
  return Event('aws:sqs', queue, 'ReceiveMessage:*', null);
}

export function DynamoDbInsert(database: string) {
  return Event('aws:dynamodb', database, 'INSERT', null);
}

export function DynamoDbModify(database: string) {
  return Event('aws:dynamodb', database, 'MODIFY', null);
}

export function DynamoDbRemove(database: string) {
  return Event('aws:dynamodb', database, 'REMOVE', null);
}

export function Schedule(action?: string) {
  return Event('aws:cloudwatch', 'events', action, null);
}
