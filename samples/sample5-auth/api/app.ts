import { Roles } from "../../../src";

export interface AppRoles extends Roles {
    Admin: boolean;
    Manager: boolean;
    Operator: boolean;
}