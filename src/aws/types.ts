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

export type LambdaEvent = (
  PingEvent
  & RemoteEvent
  & LambdaApiEvent
  & LambdaS3Event
  & LambdaSQSEvent
  & LambdaDynamoEvent
  & LambdaScheduleEvent
);

export interface LambdaHandler {
  (
    event: Partial<LambdaEvent>,
    context: Partial<LambdaContext>
    // callback?: LambdaCallback,
  ): Promise<any>;
}
