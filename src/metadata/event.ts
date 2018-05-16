import { EventAdapter } from "../types";

export interface EventMetadata {
    route: string;
    service?: string;
    method: string;
    source: string;
    resource: string;
    objectFilter: string;
    actionFilter: string;
    adapter: EventAdapter;
}