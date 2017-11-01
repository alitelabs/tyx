
import {
    LambdaContainer,
    LambdaHandler
} from "../../../src";

import { LoginService } from "../services/login";

let container = new LambdaContainer("tyx-sample5")
    .publish(LoginService);

export const handler: LambdaHandler = container.export();