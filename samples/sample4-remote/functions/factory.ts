
import {
    LambdaContainer,
    LambdaHandler
} from "../../../src";

import { BoxProxy } from "../proxies/box";
import { ItemProxy } from "../proxies/item";
import { FactoryService } from "../services/factory";

let container = new LambdaContainer("tyx-sample4")
    .register(BoxProxy)
    .register(ItemProxy)
    .publish(FactoryService);

export const handler: LambdaHandler = container.export();