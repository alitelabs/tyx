import { Service } from "../decorators";
import { Logger } from "../logger";

export abstract class BaseService implements Service {
    public readonly log: Logger;

    constructor() {
        this.log = Logger.get("service", this);
    }
}
