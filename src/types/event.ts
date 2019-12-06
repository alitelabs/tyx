import { Request } from './core';

export interface PingRequest extends Request {
  type: 'ping';
  source: 'warmer';
  action: 'ping';
  service: 'GraphQL';
  method: 'process';
  delay: number;
  event: any;
  context: any;
}

export interface EventRequest extends Request {
  source: string;
  action: string;
  time: string;

  resource: string;
  object: string;

  records: EventRecord[];
  record?: EventRecord;
}

export interface EventRecord {
  eventSource?: string;
  eventVersion?: string;
  eventName?: string;
  [prop: string]: any;
}

export interface EventResult {
  status: string;
  source: string;
  action: string;
  resource: string;
  object: string;
  returns: EventReturn[];
}

export interface EventReturn {
  service: string;
  method: string;
  error: any;
  data: any;
}
