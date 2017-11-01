import {
    Service,
    BaseConfiguration
} from "../../../src";

import { ConfigApi } from "../api/config";

@Service(ConfigApi)
export class ConfigService extends BaseConfiguration implements ConfigApi {

    constructor(config?: any) {
        super(config);
    }

    get timestampSecret() { return this.config.TIMESTAMP_SECRET; }

    get timestampStrength() { return parseInt(this.config.TIMESTAMP_STRENGTH || 0); }
}