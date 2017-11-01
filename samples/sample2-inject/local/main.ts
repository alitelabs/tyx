
import {
    ExpressContainer
} from "../../../src";

import { BoxService } from "../services/box";
import { ItemService } from "../services/item";
import { FactoryService } from "../services/factory";

let express = new ExpressContainer("tyx-sample2")
    // Internal services
    .register(BoxService, "simple")
    .register(ItemService)
    // Public service
    .publish(FactoryService);

express.start(5000);