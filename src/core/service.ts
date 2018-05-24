import { Logger } from "../logger";
import { Metadata, Service } from "../metadata";

export abstract class BaseService implements Service {
    public readonly log: Logger;

    constructor() {
        this.log = Logger.get(Metadata.name(this), this);
    }
}
