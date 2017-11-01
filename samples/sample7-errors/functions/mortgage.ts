import {
    LambdaContainer,
    LambdaHandler
} from "../../../src";

import { MortgageService } from "../services/mortgage";

let container = new LambdaContainer("tyx-sample7")
    .publish(MortgageService);

export const handler: LambdaHandler = container.export();