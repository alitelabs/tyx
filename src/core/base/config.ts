import "../env";

import {
    Service
} from "../decorators";

import { Utils } from "../utils";

import { LogLevel } from "../logger";

export const Configuration = "config";

export interface Configuration {
    appId: string;
    stage: string;
    database: string;

    logLevel: LogLevel;
    resources: Record<string, string>;
    aliases: Record<string, string>;

    restSecret: string;
    restTimeout: string;
    internalSecret: string;
    internalTimeout: string;
    remoteTimeout: string;

    remoteSecret(appId: string): string;
    remoteStage(appId: string): string;
}

const REMOTE_STAGE_PREFIX = "REMOTE_STAGE_";
const REMOTE_SECRET_PREFIX = "REMOTE_SECRET_";

export abstract class BaseConfiguration implements Configuration {

    private _appId: string;
    protected config: Record<string, any>;

    constructor(config?: Record<string, any>) {
        this.config = config || process.env;
    }

    public init(appId: string) {
        this._appId = appId;
    }

    get appId() { return this._appId; }

    get stage() { return this.config.STAGE || "local"; }

    get database() { return this.config.DATABASE; }

    get logLevel(): LogLevel {
        switch (this.config.LOG_LEVEL) {
            case "ALL": return LogLevel.ALL;
            case "TRACE": return LogLevel.TRACE;
            case "DEBUG": return LogLevel.DEBUG;
            case "INFO": return LogLevel.INFO;
            case "WARN": return LogLevel.WARN;
            case "ERROR": return LogLevel.ERROR;
            case "FATAL": return LogLevel.FATAL;
            case "OFF": return LogLevel.OFF;
            default: return LogLevel.INFO;
        }
    }

    get aliases() {
        let cfg = this.config.RESOURCES;
        if (!cfg) return {};
        let res = Utils.parseMap(cfg, "$");
        return res;
    }

    get resources() {
        let aliases = this.aliases;
        let res = {};
        for (let rsrc in aliases) res[aliases[rsrc]] = rsrc;
        return res;
    }

    get restSecret() { return this.config.REST_SECRET || undefined; }

    get restTimeout() { return this.config.REST_TIMEOUT || "10min"; }

    get internalSecret() { return this.config.INTERNAL_SECRET || undefined; }

    get internalTimeout() { return this.config.INTERNAL_TIMEOUT || "5s"; }

    get remoteTimeout() { return this.config.REMOTE_TIMEOUT || "5s"; }

    public remoteSecret(appId: string): string {
        appId = appId && appId.split("-").join("_").toUpperCase();
        return this.config[REMOTE_SECRET_PREFIX + appId];
    }

    public remoteStage(appId: string): string {
        appId = appId && appId.split("-").join("_").toUpperCase();
        return this.config[REMOTE_STAGE_PREFIX + appId];
    }
}

@Service(Configuration)
export class DefaultConfiguration extends BaseConfiguration {
    constructor(config?: any) {
        super(config);
    }
}