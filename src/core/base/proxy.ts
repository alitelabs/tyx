import "../env";

import {
    RemoteCall
} from "../types";

import {
    ProxyMetadata
} from "../metadata";

import {
    Proxy
} from "../decorators";

import {
    Configuration
} from "./config";

import {
    Security
} from "./security";

import {
    Logger
} from "../logger";

export abstract class BaseProxy implements Proxy {

    protected config: Configuration;
    protected security: Security;

    public readonly log: Logger;

    constructor() {
        this.log = Logger.get(ProxyMetadata.service(this), this);
    }

    public initialize(config: Configuration, security: Security) {
        this.config = config;
        this.security = security;
    }

    public static get metadata(): ProxyMetadata {
        return ProxyMetadata.get(this);
    }

    public get metadata(): ProxyMetadata {
        return ProxyMetadata.get(this) as ProxyMetadata;
    }

    protected async proxy(method: Function, params: IArguments): Promise<any> {
        let startTime = this.log.time();
        try {
            let type: ("remote" | "internal") = "remote";
            let appId = ProxyMetadata.application(this) || this.config.appId;
            if (this.config.appId === appId) type = "internal";
            let call: RemoteCall = {
                type,
                application: appId,
                service: ProxyMetadata.service(this),
                method: method.name,
                requestId: undefined,
                token: undefined,
                args: []
            };
            for (let i = 0; i < params.length; i++) {
                call.args[i] = params[i];
            }
            call.token = await this.token(call);
            let response = await this.invoke(call);
            return response;
        } catch (e) {
            throw e;
        } finally {
            this.log.timeEnd(startTime, `${method.name}`);
        }
    }

    protected abstract async token(call: RemoteCall): Promise<string>;

    protected abstract async invoke(call: RemoteCall): Promise<any>;
}
