import { Core } from '../core/core';
import { HttpUtils } from '../core/http';
import { BadRequest, InternalServerError } from '../errors';
import { Logger } from '../logger';
import { LogLevel } from '../types/config';
import { EventRequest, EventResult } from '../types/event';
import { HttpMethod, HttpRequest, HttpResponse } from '../types/http';
import { Utils } from '../utils';
import { LambdaError } from './error';
// tslint:disable-next-line:max-line-length
import { LambdaApiEvent as LambdaHttpEvent, LambdaContext, LambdaDynamoEvent, LambdaEvent, LambdaHandler, LambdaS3Event, LambdaScheduleEvent, LambdaSQSEvent, PingEvent, RemoteEvent } from './types';
import uuid = require('uuid');

export abstract class LambdaAdapter {

  private static log = Logger.get('TYX', LambdaAdapter);

  public static get functionName() {
    return process.env.AWS_LAMBDA_FUNCTION_NAME || '<script>';
  }

  public static get functionVersion() {
    return process.env.AWS_LAMBDA_FUNCTION_VERSION || '$VER';
  }

  public static get logStream() {
    return (process.env.AWS_LAMBDA_LOG_STREAM_NAME || '<console>');
  }

  public static get identity() {
    let id = process.env.AWS_LAMBDA_LOG_STREAM_NAME || uuid();
    id = id.substring(id.indexOf(']') + 1);
    if (id.length === 32) {
      id = id.substr(0, 8) + '-' +
        id.substr(8, 4) + '-' +
        id.substr(12, 4) + '-' +
        id.substr(16, 4) + '-' +
        id.substring(20);
    }
    return id;
  }

  public static export(): LambdaHandler {
    LogLevel.set(process.env.LOG_LEVEL as any);
    return (event, context, callback) => {
      this.handler(event, context as any)
        .then(res => callback(null, res))
        .catch(err => callback(new LambdaError(err), null));
    };
  }

  public static async handler(event: Partial<LambdaEvent>, context: LambdaContext): Promise<any> {
    this.log.debug('Event: %j', event);
    this.log.debug('Context: %j', context);

    if (!event || !Object.keys(event).length || event.type === 'ping') {
      try {
        const res = await this.ping(event as PingEvent, context);
        return res;
      } catch (err) {
        this.log.error(err);
        return err;
      }
    } else if (event.httpMethod) {
      this.log.debug('HTTP event detected');
      try {
        const res = await this.http(event as LambdaHttpEvent, context);
        return HttpUtils.prepare(res);
      } catch (err) {
        this.log.error(err);
        return HttpUtils.error(err);
      }
    } else if ((event.type === 'remote' || event.type === 'internal') && event.service && event.method) {
      this.log.debug('Remote event detected');
      try {
        return await this.remote(event as RemoteEvent, context);
      } catch (err) {
        this.log.error(err);
        throw InternalServerError.wrap(err);
      }
    } else if (event.type === 'schedule' && event.action) {
      this.log.debug('Schedule event detected');
      try {
        return await this.schedule(event as LambdaScheduleEvent, context);
      } catch (err) {
        this.log.error(err);
        throw InternalServerError.wrap(err);
      }
    } else if (event.Records && event.Records[0] && event.Records[0].eventSource === 'aws:sqs') {
      this.log.debug('SQS event detected');
      try {
        return await this.sqs(event as LambdaSQSEvent, context);
      } catch (err) {
        this.log.error(err);
        throw InternalServerError.wrap(err);
      }
    } else if (event.Records && event.Records[0] && event.Records[0].eventSource === 'aws:s3') {
      this.log.debug('S3 event detected');
      try {
        return await this.s3(event as LambdaS3Event, context);
      } catch (err) {
        this.log.error(err);
        throw InternalServerError.wrap(err);
      }
    } else if (event.Records && event.Records[0] && event.Records[0].eventSource === 'aws:dynamodb') {
      this.log.debug('DynamoDB event detected');
      try {
        return await this.dynamo(event as LambdaDynamoEvent, context);
      } catch (err) {
        this.log.error(err);
        throw InternalServerError.wrap(err);
      }
    } else {
      throw new BadRequest('Invalid event');
    }
  }

  private static async ping(event: PingEvent, context: LambdaContext): Promise<any> {
    const core = await Core.get();
    return core.ping({
      requestId: context.awsRequestId,
      type: 'ping',
      source: 'warmer',
      action: 'ping',
      service: 'GraphQL',
      method: 'process',
      event,
      context
    });
  }

  private static async http(event: LambdaHttpEvent, context: LambdaContext): Promise<HttpResponse> {
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
