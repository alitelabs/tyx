import { PermissionMetadata } from "../metadata/security";
import { AuthInfo } from "./security";

export interface Context {
    requestId: string;
    auth: AuthInfo;
    permission: PermissionMetadata;
}

export interface Request {
    type: "remote" | "internal" | "http" | "event" | "graphql";
    application: string;
    service: string;
    method: string;
    requestId: string;
}