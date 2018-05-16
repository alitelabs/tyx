import { Service } from "../decorators";
import { Logger } from "../logger";
import { ServiceMetadata } from "../metadata";

export abstract class BaseService implements Service {
    public readonly log: Logger;

    constructor() {
        this.log = Logger.get(ServiceMetadata.service(this), this);
    }
}
