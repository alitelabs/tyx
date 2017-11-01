import {
    ExpressContainer
} from "../../../src";

import { ExampleService } from "../services/example";

let express = new ExpressContainer("tyx-sample6")
    .publish(ExampleService);

express.start(5000);