import { EventMetadata } from "./event";
import { HttpMetadata } from "./http";
import { RemoteMetadata } from "./remote";
import { PermissionMetadata } from "./security";

export interface ContainerMetadata {
    permissions: Record<string, PermissionMetadata>;
    remoteMetadata: Record<string, RemoteMetadata>;
    httpMetadata: Record<string, HttpMetadata>;
    eventMetadata: Record<string, EventMetadata[]>;
}