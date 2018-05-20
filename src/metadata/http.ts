import { ArgBinder, HttpAdapter, HttpCode } from "../types";

export interface HttpMetadata {
    service?: string;
    route: string;
    method: string;
    verb: string;
    resource: string;
    model: string;
    code: HttpCode;
    adapter: HttpAdapter;
}

export interface BindingMetadata {
    service?: string;
    method: string;
    contentType?: string;
    argBindings: ArgBindingMetadata[];
}

export interface ArgBindingMetadata {
    index: number;
    type: string;
    param: string;
    binder: ArgBinder;
}
