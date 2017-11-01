import "../env";

import {
    ServiceMetadata
} from "../metadata";

import {
    Service
} from "../decorators";

import { Logger } from "../logger";

export abstract class BaseService implements Service {
    public readonly log: Logger;

    constructor() {
        this.log = Logger.get(ServiceMetadata.service(this), this);
    }

    public static get metadata() {
        return ServiceMetadata.get(this);
    }

    public get metadata() {
        return ServiceMetadata.get(this);
    }
}
