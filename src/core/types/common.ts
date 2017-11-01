import "../env";

import { PermissionMetadata } from "../metadata/security";
import { AuthInfo } from "./security";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export type HttpCode = 200 | 201 | 202 | 400 | 401 | 403 | 405 | 404 | 409 | 500 | 501 | 503 | 504;

export interface Context {
    requestId: string;
    token: string;
    auth: AuthInfo;
    permission: PermissionMetadata;
}

export interface Call {
    type: "remote" | "internal" | "rest" | "event";
    application: string;
    service: string;
    method: string;
    requestId: string;
}