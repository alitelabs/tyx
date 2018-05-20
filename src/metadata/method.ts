import { Roles } from "../types";

export interface MethodMetadata {
    api?: string;
    service?: string;
    method: string;
    access: string;
    roles: Roles;
    args?: any;
    returns?: string;
}
