
import {
    LambdaContainer,
    LambdaHandler
} from "../../../src";

import { ItemService } from "../services/item";

let container = new LambdaContainer("tyx-sample3")
    .publish(ItemService);

export const handler: LambdaHandler = container.export();