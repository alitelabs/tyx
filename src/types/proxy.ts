import { Request } from "./common";

export interface RemoteRequest extends Request {
    application: string;
    token: string;
    args: any[];
}

export interface RemoteResponse {
    [key: string]: any;
}