import { Logger } from "../logger";

export abstract class BaseService {
    public readonly log: Logger;

    constructor() {
        this.log = Logger.get("service", this);
    }
}
