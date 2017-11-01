import "../env";

import {
    HttpCode,
    RestAdapter,
    RestBinder
} from "../types";

export interface RestMetadata {
    service?: string;
    route: string;
    method: string;
    verb: string;
    resource: string;
    model: string;
    code: HttpCode;
    adapter: RestAdapter;
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
    binder: RestBinder;
}
