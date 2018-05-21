import { Service } from "../decorators";
import { Logger } from "../logger";
import { Metadata } from "../metadata";

export abstract class BaseService implements Service {
    public readonly log: Logger;

    constructor() {
        this.log = Logger.get(Metadata.name(this), this);
    }
}
