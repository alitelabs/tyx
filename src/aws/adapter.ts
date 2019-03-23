import { Core } from '../core/core';
import { HttpUtils } from '../core/http';
import { BadRequest, InternalServerError } from '../errors';
import { Logger } from '../logger';
import { LogLevel } from '../types/config';
import { EventRecord, EventRequest, EventResult } from '../types/event';
import { HttpMethod, HttpRequest, HttpResponse } from '../types/http';
import { RemoteRequest } from '../types/proxy';
import { Utils } from '../utils';
import { LambdaError } from './error';

export type UUID = string;

export interface RemoteEvent extends RemoteRequest {
  // Any additional params ...
}

export interface LambdaS3Event {
  Records: LambdaS3Record[];
}

export interface LambdaSQSEvent {
  Records: LambdaSQSRecord[];
}

export interface LambdaEventRecord extends EventRecord {
  eventSource: 'aws:s3' | 'aws:dynamodb' | 'aws:sqs';
  eventVersion: string;
  eventName: string; // TODO: Enum
  awsRegion: string;
}

export interface LambdaSQSRecord extends LambdaEventRecord {
  eventSource: 'aws:sqs';
  body: string;
  eventSourceARN: string;
  messageId: string;
}

export interface LambdaS3Record extends LambdaEventRecord {
  eventSource: 'aws:s3';
  eventTime: string;
  userIdentity?: {
    principalId: string;
    [key: string]: string;
  };
  requestParameters?: {
    sourceIPAddress: string;
    [key: string]: string;
  };
  responseElements: Record<string, string>;
  // {
  // "x-amz-request-id": "977AC95B5E343C51",
  // "x-amz-id-2": "ECIEtKyeUlJpLZskSCbflZJZdPz1XGVu6mOb9knu50TFHlL/FcRSkn5g76IYWrpG874IR0rCTmA="
  // }
  s3: {
    s3SchemaVersion: '1.0' | string,
    configurationId: string,
    bucket: {
      name: string;
      ownerIdentity: {
        principalId: string;
      },
      arn: string;
    };
    object: {
      key: string,
      size: number,
      eTag: string,
      sequencer: string,
    };
  };
}

export interface LambdaDynamoEvent {
  Records: LambdaDynamoRecord[];
}

export interface LambdaDynamoRecord extends LambdaEventRecord {
  eventID: string;
  eventSource: 'aws:dynamodb';
  eventSourceARN: string;
  eventName: 'INSERT' | 'MODIFY' | 'REMOVE';
  // TODO: object keyword supported in typescript ????
  dynamodb: {
    ApproximateCreationDateTime: number,
    Keys: Record<string, object>;
    SequenceNumber: string;
    SizeBytes: number,
    StreamViewType: 'KEYS_ONLY' | 'NEW_IMAGE' | 'OLD_IMAGE' | 'NEW_AND_OLD_IMAGES';
    NewImage?: Record<string, object>;
    OldImage?: Record<string, object>;
  };
}

export interface LambdaScheduleEvent {
  type: 'schedule';
  action: string;
  [prop: string]: string;
}

export interface LambdaApiEvent {
  resource: string;
  path: string;
  httpMethod: string;
  headers: {
    [header: string]: string;
  };
  pathParameters: {
    [param: string]: string;
  };
  queryStringParameters: {
    [param: string]: string;
  };
  body: string | null;
  isBase64Encoded: boolean;

  stageVariables?: {
    [variable: string]: string;
  };
  requestContext?: {
    accountId: string;
    resourceId: string;
    stage: string;
    requestId: UUID;
    identity: {
      sourceIp: string;
      userAgent: string;
      cognitoIdentityId: any;
      cognitoIdentityPoolId: any;
      cognitoAuthenticationType: any;
      cognitoAuthenticationProvider: any;
      accountId: any;
      caller: any;
      apiKey: any;
      accessKey: any;
      userArn: any;
      user: any;
    };
  };
}

export interface LambdaContext {
  functionName: string;
  functionVersion: string;
  invokeid: UUID;
  awsRequestId: UUID;

  callbackWaitsForEmptyEventLoop: boolean;
  logGroupName: string;
  logStreamName: string;
  memoryLimitInMB: string;
  invokedFunctionArn: string;

  succeed?: (object: any) => void;
  fail?: (error: any) => void;
  done?: (error: any, result: any) => void;
}

export interface LambdaCallback {
  (err: LambdaError, response?: HttpResponse | Object): void;
}

export type LambdaEvent = RemoteEvent & LambdaApiEvent & LambdaS3Event & LambdaSQSEvent & LambdaDynamoEvent & LambdaScheduleEvent;

export interface LambdaHandler {
  (
    event: LambdaEvent,
    context: LambdaContext,
    callback: LambdaCallback,
  ): boolean | void;
}

export abstract class LambdaAdapter {

  private static log = Logger.get('TYX', LambdaAdapter);

  public static export(): LambdaHandler {
    LogLevel.set(process.env.LOG_LEVEL as any);
    return (event, context, callback) => {
      this.handler(event, context)
        .then(res => callback(null, res))
        .catch(err => callback(new LambdaError(err), null));
    };
  }

  public static async handler(event: LambdaEvent, context: LambdaContext) {
    this.log.debug('Lambda Event: %j', event);
    this.log.debug('Lambda Context: %j', context);

    if (event.httpMethod) {
      this.log.debug('HTTP event detected');
      try {
        const res = await this.http(event, context);
        return HttpUtils.prepare(res);
      } catch (err) {
        this.log.error(err);
        return HttpUtils.error(err);
      }
    }
    if ((event.type === 'remote' || event.type === 'internal') && event.service && event.method) {
      this.log.debug('Remote event detected');
      try {
        return await this.remote(event, context);
      } catch (err) {
        this.log.error(err);
        throw InternalServerError.wrap(err);
      }
    } else if (event.type === 'schedule' && event.action) {
      this.log.debug('Schedule event detected');
      try {
        return await this.schedule(event, context);
      } catch (err) {
        this.log.error(err);
        throw InternalServerError.wrap(err);
      }
    } else if (event.Records && event.Records[0] && event.Records[0].eventSource === 'aws:sqs') {
      this.log.debug('SQS event detected');
      try {
        return await this.sqs(event, context);
      } catch (err) {
        this.log.error(err);
        throw InternalServerError.wrap(err);
      }
    } else if (event.Records && event.Records[0] && event.Records[0].eventSource === 'aws:s3') {
      this.log.debug('S3 event detected');
      try {
        return await this.s3(event, context);
      } catch (err) {
        this.log.error(err);
        throw InternalServerError.wrap(err);
      }
    } else if (event.Records && event.Records[0] && event.Records[0].eventSource === 'aws:dynamodb') {
      this.log.debug('DynamoDB event detected');
      try {
        return await this.dynamo(event, context);
      } catch (err) {
        this.log.error(err);
        throw InternalServerError.wrap(err);
      }
    } else {
      throw new BadRequest('Invalid event');
    }
  }

  private static async http(event: LambdaApiEvent, context: LambdaContext): Promise<HttpResponse> {
    let resource = event.resource;
    const prefix = process.env.PREFIX || ('/' + process.env.STAGE);
    if (event.resource && prefix && resource.startsWith(prefix)) resource = resource.replace(prefix, '');
    const requestId = Utils.isUUID(context && context.awsRequestId) ? context.awsRequestId : Utils.uuid();
    const req: HttpRequest = {
      type: 'http',
      requestId,
      sourceIp: (event.requestContext
        && event.requestContext.identity
        && event.requestContext.identity.sourceIp) || '255.255.255.255',

      application: undefined,
      service: undefined,
      method: undefined,

      httpMethod: event.httpMethod as HttpMethod,
      resource,
      path: event.path,
      pathParameters: event.pathParameters || {},
      queryStringParameters: event.queryStringParameters || {},
      headers: HttpUtils.canonicalHeaders(event.headers || {}),
      body: event.body,
      isBase64Encoded: event.isBase64Encoded || false,
    };
    const core = await Core.get();
    return core.httpRequest(req);
  }

  private static async remote(event: RemoteEvent, context: LambdaContext): Promise<any> {
    event.requestId = context && context.awsRequestId || Utils.uuid();
    const core = await Core.get();
    return core.remoteRequest(event);
  }

  private static async s3(event: LambdaS3Event, context: LambdaContext): Promise<EventResult> {
    const requestId = context && context.awsRequestId || Utils.uuid();
    const time = new Date().toISOString();
    const reqs: Record<string, EventRequest> = {};

    for (const record of event.Records) {
      const resource = record.s3.bucket.name;
      const object = record.s3.object.key;
      const action = record.eventName;

      const group = `${resource}/${action}@${object}`;
      if (!reqs[group]) {
        reqs[group] = {
          type: 'event',
          source: 'aws:s3',
          application: undefined,
          service: undefined,
          method: undefined,
          requestId,
          resource,
          action,
          time,
          object,
          records: [],
        };
      }
      reqs[group].records.push(record);
    }

    // TODO: Iteration of all, combine result
    let result: EventResult;
    for (const key in reqs) {
      const req = reqs[key];
      this.log.info('S3 Request [%s:%s]: %j', req.resource, req.object, req);
      const core = await Core.get();
      result = await core.eventRequest(req);
    }
    return result;
  }

  private static async sqs(event: LambdaSQSEvent, context: LambdaContext): Promise<EventResult[]> {

    const requestId = context && context.awsRequestId || Utils.uuid();
    const time = new Date().toISOString();
    const reqs = new Map<string, EventRequest>();

    for (const record of event.Records) {

      try {
        // get Queue Name
        // TODO: handle differently if arn is set by `Resource`, it will throw an exception
        const resource = record.eventSourceARN.split(':').pop();
        const object = JSON.parse(record.body);
        const action = 'ReceiveMessage:*';

        const group = `${resource}/${action}@${record.messageId}`;

        reqs.set(group, {
          type: 'event',
          source: 'aws:sqs',
          application: undefined,
          service: undefined,
          method: undefined,
          requestId,
          resource,
          action,
          time,
          object,
          records: [record],
        });
      } catch (ex) {
        this.log.error('Error parsing SQS event', ex);
      }
    }

    const events: Promise<EventResult>[] = [];
    for (const value of reqs.values()) {
      this.log.info('SQS Request [%s:%s]: %j', value.resource, value.object, value);
      const core = await Core.get();
      events.push(core.eventRequest(value));
    }

    return Promise.all(events);
  }

  private static async schedule(event: LambdaScheduleEvent, context: LambdaContext): Promise<EventResult> {
    const requestId = context && context.awsRequestId || Utils.uuid();
    const time = new Date().toISOString();

    const req: EventRequest = {
      type: 'event',
      source: 'aws:cloudwatch',
      application: undefined,
      service: undefined,
      method: undefined,
      requestId,
      resource: 'events',
      action: event.action,
      time,
      object: null,
      records: [
        event,
      ],
    };

    this.log.info('Schedule Request [%s:%s]: %j', req.resource, req.object, req);
    const core = await Core.get();
    const result = await core.eventRequest(req);
    return result;
  }

  private static async dynamo(event: LambdaDynamoEvent, context: LambdaContext): Promise<EventResult> {
    const requestId = context && context.awsRequestId || Utils.uuid();
    const time = new Date().toISOString();
    const reqs: Record<string, EventRequest> = {};

    for (const record of event.Records) {
      const resource = record.eventSourceARN.split('/')[1];
      const object = resource;
      const action = record.eventName;

      const group = `${resource}/${action}@${object}`;
      if (!reqs[group]) {
        reqs[group] = {
          type: 'event',
          source: 'aws:dynamodb',
          application: undefined,
          service: undefined,
          method: undefined,
          requestId,
          resource,
          action,
          time,
          object,
          records: [],
        };
      }
      reqs[group].records.push(record);
    }

    // TODO: Iteration of all, combine result
    let result: EventResult;
    for (const key in reqs) {
      const req = reqs[key];
      this.log.info('Dynamo Request [%s]: %j', req.resource, req);
      const core = await Core.get();
      result = await core.eventRequest(req);
    }
    return result;
  }
}
