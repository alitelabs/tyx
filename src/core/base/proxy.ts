import { Proxy } from "../decorators";
import { Logger } from "../logger";
import { ProxyMetadata } from "../metadata";
import { RemoteRequest } from "../types";
import { Configuration } from "./config";
import { Security } from "./security";

export abstract class BaseProxy implements Proxy {

    public readonly log: Logger;
    protected config: Configuration;
    protected security: Security;

    constructor() {
        this.log = Logger.get(ProxyMetadata.service(this), this);
    }

    public initialize(config: Configuration, security: Security) {
        this.config = config;
        this.security = security;
    }

    protected async proxy(method: Function, params: IArguments): Promise<any> {
        let startTime = this.log.time();
        try {
            let type: ("remote" | "internal") = "remote";
            let appId = ProxyMetadata.application(this) || this.config.appId;
            if (this.config.appId === appId) type = "internal";
            let call: RemoteRequest = {
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

    protected abstract async token(call: RemoteRequest): Promise<string>;

    protected abstract async invoke(call: RemoteRequest): Promise<any>;
}
