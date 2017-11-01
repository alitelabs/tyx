import "../env";

import { PermissionMetadata } from "./security";
import { RemoteMetadata } from "./remote";
import { RestMetadata } from "./rest";
import { EventMetadata } from "./event";

export interface ContainerMetadata {
    permissions: Record<string, PermissionMetadata>;
    remoteMetadata: Record<string, RemoteMetadata>;
    restMetadata: Record<string, RestMetadata>;
    eventMetadata: Record<string, EventMetadata[]>;
}