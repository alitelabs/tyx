import { Request } from "./core";

export interface GraphRequest extends Request {
    type: "graphql";
    application: string;
    input: any;
    sourceIp: string;
    token: string;
}