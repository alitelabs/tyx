import { Configuration } from "../../../src";

export const ConfigApi = Configuration;

export interface ConfigApi extends Configuration {
    timestampSecret: string;
    timestampStrength: number;
}