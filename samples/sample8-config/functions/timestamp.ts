import {
    LambdaContainer,
    LambdaHandler
} from "../../../src";

import { ConfigService } from "../services/config";
import { TimestampService } from "../services/timestamp";

let container = new LambdaContainer("tyx-sample8")
    .register(ConfigService)
    .publish(TimestampService);

export const handler: LambdaHandler = container.export();