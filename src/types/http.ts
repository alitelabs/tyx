import { Request } from './core';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export type HttpCode = 200 | 201 | 202 | 400 | 401 | 403 | 405 | 404 | 409 | 500 | 501 | 503 | 504;

export interface HttpRequest extends Request {
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
  contentType?: HttpContentType;
  multiparts?: HttpMultipart[];
}

export interface HttpHeader {
  value: string;
  params: Record<string, string>;
}

export interface HttpContentType extends HttpHeader {
  domainModel?: string;
  isJson?: boolean;
  isMultipart?: boolean;
}

export interface HttpMultipart {
  headers: Record<string, HttpHeader>;
  contentType: HttpContentType;
  body: string;
}

// tslint:disable-next-line:variable-name
export const HttpResponse = 'HttpResponse';

export interface HttpResponse {
  statusCode: HttpCode;
  contentType?: string;
  headers?: Record<string, string>;
  body: any;
}
