import "../env";

import {
    Call,
    HttpCode,
    HttpMethod,
    Context
} from "./common";

export interface RestCall extends Call {
    httpMethod: HttpMethod;
    resource: string;
    path: string;
    sourceIp: string;

    headers?: Record<string, string>;
    pathParameters?: Record<string, string>;
    queryStringParameters?: Record<string, string>;
    body?: string | null;
    isBase64Encoded?: boolean;

    json?: any;
    contentType?: RestContentType;
    multiparts?: RestMultipart[];
}

export interface RestHeader {
    value: string;
    params: Record<string, string>;
}

export interface RestContentType extends RestHeader {
    domainModel?: string;
    isJson?: boolean;
    isMultipart?: boolean;
}

export interface RestMultipart {
    headers: Record<string, RestHeader>;
    contentType: RestContentType;
    body: string;
}

export interface RestResult {
    // ctx: Context;
    statusCode: HttpCode;
    contentType?: string;
    headers?: Record<string, string>;
    body: any;
}

export interface RestAdapter {
    (
        next: (...args: any[]) => Promise<any>,
        ctx?: Context,
        call?: RestCall,
        path?: Record<string, string>,
        query?: Record<string, string>
    ): Promise<any>;
}

export interface RestBinder {
    (
        ctx: Context,
        call: RestCall
    ): any;
}

export interface ContextBinder {
    (
        ctx: Context
    ): any;
}

export interface CallBinder {
    (
        call: RestCall
    ): any;
}