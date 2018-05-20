import { EventAdapter } from "../types";

export interface EventMetadata {
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