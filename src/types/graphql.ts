import { Request } from "./core";

export interface GraphRequest extends Request {
    type: "graphql";
    application: string;
    obj: any;
    args: any;
    info: any;
    sourceIp: string;
    token: string;
}