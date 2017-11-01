
import {
    LambdaContainer,
    LambdaHandler
} from "../../../src";

import { BoxProxy } from "../proxies/box";
import { ItemProxy } from "../proxies/item";
import { FactoryService } from "../services/factory";

let container = new LambdaContainer("tyx-sample3")
    // Use proxy instead of service implementation
    .register(BoxProxy)
    .register(ItemProxy)
    .publish(FactoryService);

export const handler: LambdaHandler = container.export();