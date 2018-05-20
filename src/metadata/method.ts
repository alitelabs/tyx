import { Roles } from "../types";

export interface MethodMetadata {
    service?: string;
    method: string;
    access: string;
    roles: Roles;
    args?: any;
    returns?: string;
}
