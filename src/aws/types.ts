import { EventRecord } from "../types/event";
import { HttpResponse } from "../types/http";
import { RemoteRequest } from "../types/proxy";
import { LambdaError } from "./error";

export interface PingEvent {
  type?: 'ping';
  delay?: number;
}

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

export interface LambdaHttpEvent {
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
    requestId: string;
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
  invokeid: string;
  awsRequestId: string;

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

export interface LambdaHandler {
  (
    event: Partial<LambdaEvent>,
    context: Partial<LambdaContext>
    // callback?: LambdaCallback,
  ): Promise<any>;
}

export type LambdaEvent = (
  PingEvent
  | RemoteEvent
  | LambdaHttpEvent
  | LambdaS3Event
  | LambdaSQSEvent
  | LambdaDynamoEvent
  | LambdaScheduleEvent
);

export namespace LambdaEvent {
  export function isPingEvent(event: Partial<LambdaEvent>): event is PingEvent {
    return (
      !event ||
      !Object.keys(event).length ||
      (event as unknown as PingEvent).type === 'ping'
    );
  }

  export function isHttpEvent(event: Partial<LambdaEvent>): event is LambdaHttpEvent {
    return !!(event as LambdaHttpEvent).httpMethod;
  }

  export function isRemoteEvent(event: Partial<LambdaEvent>): event is RemoteEvent {
    return (
      ((event as RemoteEvent).type === 'remote' || (event as RemoteEvent).type === 'internal') &&
      (event as RemoteEvent).service &&
      !!(event as RemoteEvent).method
    );
  }

  export function isScheduleEvent(event: Partial<LambdaEvent>): event is LambdaScheduleEvent {
    return (
      (event as unknown as LambdaScheduleEvent).type === 'schedule' &&
      !!(event as unknown as LambdaScheduleEvent).action
    );
  }

  export function isRecordEvent(event: Partial<LambdaEvent>): event is (LambdaS3Event | LambdaSQSEvent | LambdaDynamoEvent) {
    return !!(event as unknown as (LambdaS3Event | LambdaSQSEvent | LambdaDynamoEvent)).Records;
  }

  export function isSqsEvent(event: Partial<LambdaEvent>): event is LambdaSQSEvent {
    return isRecordEvent(event) && event.Records[0]?.eventSource === 'aws:sqs';
  }

  export function isS3Event(event: Partial<LambdaEvent>): event is LambdaS3Event {
    return isRecordEvent(event) && event.Records[0]?.eventSource === 'aws:s3';
  }

  export function isDynamoEvent(event: Partial<LambdaEvent>): event is LambdaDynamoEvent {
    return isRecordEvent(event) && event.Records[0]?.eventSource === 'aws:dynamodb';
  }
}
