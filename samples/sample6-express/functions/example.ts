
import {
    LambdaContainer,
    LambdaHandler
} from "../../../src";

import { ExampleService } from "../services/example";

let container = new LambdaContainer("tyx-sample6")
    .publish(ExampleService);

export const handler: LambdaHandler = container.export();