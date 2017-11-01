
import {
    LambdaContainer,
    LambdaHandler
} from "../../../src";

import { BoxService } from "../services/box";
import { ItemService } from "../services/item";
import { FactoryService } from "../services/factory";

let container = new LambdaContainer("tyx-sample2")
    // Internal services
    .register(BoxService, "simple")
    .register(ItemService)
    // Public service
    .publish(FactoryService);

export const handler: LambdaHandler = container.export();