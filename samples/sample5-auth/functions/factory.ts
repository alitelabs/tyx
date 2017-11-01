
import {
    LambdaContainer,
    LambdaHandler
} from "../../../src";

import { FactoryService } from "../services/factory";

let container = new LambdaContainer("tyx-sample5")
    .publish(FactoryService);

export const handler: LambdaHandler = container.export();