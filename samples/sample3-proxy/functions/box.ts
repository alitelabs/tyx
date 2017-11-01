
import {
    LambdaContainer,
    LambdaHandler
} from "../../../src";

import { BoxService } from "../services/box";

let container = new LambdaContainer("tyx-sample3")
    .publish(BoxService, "simple");

export const handler: LambdaHandler = container.export();
