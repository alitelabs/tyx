import { ArgBinder, HttpAdapter, HttpCode, EventAdapter } from "../types";

export interface OldHttpMetadata {
    api?: string;
    service?: string;
    route: string;
    method: string;
    verb: string;
    resource: string;
    model: string;
    code: HttpCode;
    adapter: HttpAdapter;
}

export interface OldBindingMetadata {
    api?: string;
    service?: string;
    method: string;
    contentType?: string;
    argBindings: OldArgBindingMetadata[];
}

export interface OldArgBindingMetadata {
    index: number;
    type: string;
    param: string;
    binder: ArgBinder;
}

export interface OldEventMetadata {
    api?: string;
    service?: string;
    route: string;
    method: string;
    source: string;
    resource: string;
    objectFilter: string;
    actionFilter: string;
    adapter: EventAdapter;
}