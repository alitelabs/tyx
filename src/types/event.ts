import { Context, Request } from './core';

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

export interface EventAdapter {
  (
    next: (...args: any[]) => Promise<any>,
    ctx: Context,
    call: EventRequest,
  ): Promise<any>;
}
