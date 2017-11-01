import "../env";

import {
    Context,
    Call
} from "./common";

export interface EventCall extends Call {
    source: string;
    action: string;
    time: string;

    resource: string;
    object: string;

    records: EventRecord[];
    record?: EventRecord;
}

export interface EventRecord {
    eventSource: string;
    eventVersion: string;
    eventName: string;
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
        call: EventCall
    ): Promise<any>;
}