import { ContainerPool } from "../core";
import { BadRequest, InternalServerError } from "../errors";
import { LogLevel } from "../logger";
import { EventRecord, EventRequest, EventResult, HttpMethod, HttpRequest, HttpResponse, RemoteRequest } from "../types";
import { HttpUtils, Utils } from "../utils";
import { LambdaError } from "./error";

export type UUID = string;

export interface RemoteEvent extends RemoteRequest {
    // Any additional params ...
}

export interface LambdaS3Event {
    Records: LambdaS3Record[];
}

export interface LambdaEventRecord extends EventRecord {
    eventSource: "aws:s3" | "aws:dynamodb";
    eventVersion: string;
    eventName: string; // TODO: Enum
    awsRegion: string;
}

export interface LambdaS3Record extends LambdaEventRecord {
    eventSource: "aws:s3";
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
        s3SchemaVersion: "1.0" | string,
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
            sequencer: string
        };
    };
}

export interface LambdaDynamoEvent {
    Records: LambdaDynamoRecord[];
}

export interface LambdaDynamoRecord extends LambdaEventRecord {
    eventID: string;
    eventSource: "aws:dynamodb";
    eventSourceARN: string;
    eventName: "INSERT" | "MODIFY" | "REMOVE";
    // TODO: object keyword supported in typescript ????
    dynamodb: {
        ApproximateCreationDateTime: number,
        Keys: Record<string, object>;
        SequenceNumber: string;
        SizeBytes: number,
        StreamViewType: "KEYS_ONLY" | "NEW_IMAGE" | "OLD_IMAGE" | "NEW_AND_OLD_IMAGES";
        NewImage?: Record<string, object>;
        OldImage?: Record<string, object>;
    };
}

export interface LambdaScheduleEvent {
    type: string;
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
    req?: {
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

export type LambdaEvent = RemoteEvent & LambdaApiEvent & LambdaS3Event & LambdaDynamoEvent & LambdaScheduleEvent;

export interface LambdaHandler {
    (
        event: LambdaEvent,
        context: LambdaContext,
        callback: LambdaCallback
    ): boolean | void;
}

export class LambdaContainer extends ContainerPool {

    constructor(applicationId: string) {
        super(applicationId, LambdaContainer.name);
    }

    public export(): LambdaHandler {
        return (event, context, callback) => {
            this.handler(event, context)
                .then(res => callback(null, res))
                .catch(err => callback(new LambdaError(err), null));
        };
    }

    private async handler(event: LambdaEvent, context: LambdaContext) {
        try {
            await this.prepare();
        } catch (err) {
            this.log.error(err);
            return HttpUtils.error(err);
        }

        LogLevel.set(this.config.logLevel);
        this.log.debug("Lambda Event: %j", event);
        this.log.debug("Lambda Context: %j", context);

        if (event.httpMethod) {
            try {
                let res = await this.http(event, context);
                return HttpUtils.prepare(res);
            } catch (err) {
                this.log.error(err);
                return HttpUtils.error(err);
            }
        } else if ((event.type === "remote" || event.type === "internal") && event.service && event.method) {
            try {
                return await this.remote(event, context);
            } catch (err) {
                this.log.error(err);
                throw InternalServerError.wrap(err);
            }
        } else if (event.type === "schedule" && event.action) {
            try {
                return await this.schedule(event, context);
            } catch (err) {
                this.log.error(err);
                throw InternalServerError.wrap(err);
            }
        } else if (event.Records && event.Records[0] && event.Records[0].eventSource === "aws:s3") {
            try {
                return await this.s3(event, context);
            } catch (err) {
                this.log.error(err);
                throw InternalServerError.wrap(err);
            }
        } else if (event.Records && event.Records[0] && event.Records[0].eventSource === "aws:dynamodb") {
            try {
                return await this.dynamo(event, context);
            } catch (err) {
                this.log.error(err);
                throw InternalServerError.wrap(err);
            }
        } else {
            throw new BadRequest("Invalid event");
        }
    }

    private async http(event: LambdaApiEvent, context: LambdaContext): Promise<HttpResponse> {
        let req: HttpRequest = {
            type: "http",
            requestId: context && context.awsRequestId || Utils.uuid(),
            sourceIp: (event.req
                && event.req.identity
                && event.req.identity.sourceIp) || "255.255.255.255",

            application: undefined,
            service: undefined,
            method: undefined,

            httpMethod: event.httpMethod as HttpMethod,
            resource: event.resource,
            path: event.path,
            pathParameters: event.pathParameters || {},
            queryStringParameters: event.queryStringParameters || {},
            headers: HttpUtils.canonicalHeaders(event.headers || {}),
            body: event.body,
            isBase64Encoded: event.isBase64Encoded || false
        };
        return super.httpRequest(req);
    }

    private async remote(event: RemoteEvent, context: LambdaContext): Promise<any> {
        event.requestId = context && context.awsRequestId || Utils.uuid();
        return super.remoteRequest(event);
    }

    private async s3(event: LambdaS3Event, context: LambdaContext): Promise<EventResult> {
        this.log.info("S3 Event: %j", event);

        let requestId = context && context.awsRequestId || Utils.uuid();
        let time = new Date().toISOString();
        let reqs: Record<string, EventRequest> = {};

        for (let record of event.Records) {
            let resource = record.s3.bucket.name;
            let object = record.s3.object.key;
            let action = record.eventName;

            let group = `${resource}/${action}@${object}`;
            if (!reqs[group]) reqs[group] = {
                type: "event",
                source: "aws:s3",
                application: undefined,
                service: undefined,
                method: undefined,
                requestId,
                resource,
                action,
                time,
                object,
                records: []
            };
            reqs[group].records.push(record);
        }

        // TODO: Iteration of all, combine result
        let result: EventResult;
        for (let key in reqs) {
            let req = reqs[key];
            this.log.info("S3 Request [%s:%s]: %j", req.resource, req.object, req);
            result = await super.eventRequest(req);
        }
        return result;
    }

    private async schedule(event: LambdaScheduleEvent, context: LambdaContext): Promise<EventResult> {
        this.log.info("Schedule Event: %j", event);

        let requestId = context && context.awsRequestId || Utils.uuid();
        let time = new Date().toISOString();

        let req: EventRequest = {
            type: "event",
            source: "aws:cloudwatch",
            application: undefined,
            service: undefined,
            method: undefined,
            requestId,
            resource: "events",
            action: event.action,
            time,
            object: null,
            records: [
                event
            ]
        };

        this.log.info("Schedule Request [%s:%s]: %j", req.resource, req.object, req);
        let result = await super.eventRequest(req);
        return result;
    }

    private async dynamo(event: LambdaDynamoEvent, context: LambdaContext): Promise<EventResult> {
        this.log.info("Dynamo Event: %j", event);

        let requestId = context && context.awsRequestId || Utils.uuid();
        let time = new Date().toISOString();
        let reqs: Record<string, EventRequest> = {};

        for (let record of event.Records) {
            let resource = record.eventSourceARN.split("/")[1];
            let object = resource;
            let action = record.eventName;

            let group = `${resource}/${action}@${object}`;
            if (!reqs[group]) reqs[group] = {
                type: "event",
                source: "aws:dynamodb",
                application: undefined,
                service: undefined,
                method: undefined,
                requestId,
                resource,
                action,
                time,
                object,
                records: []
            };
            reqs[group].records.push(record);
        }

        // TODO: Iteration of all, combine result
        let result: EventResult;
        for (let key in reqs) {
            let req = reqs[key];
            this.log.info("Dynamo Request [%s]: %j", req.resource, req);
            result = await super.eventRequest(req);
        }
        return result;
    }
}

