import { Roles } from "../types";

export interface PermissionMetadata {
    service?: string;
    method: string;
    name: string;
    roles: Roles;
}

