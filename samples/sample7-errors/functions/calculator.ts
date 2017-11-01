import {
    LambdaContainer,
    LambdaHandler
} from "../../../src";

import { CalculatorService } from "../services/calculator";
import { MortgageProxy } from "../proxies/mortgage";
import { MissingProxy } from "../proxies/missing";
import { UnhandledProxy } from "../proxies/unhandled";

let container = new LambdaContainer("tyx-sample7")
    .register(MortgageProxy)
    .register(MissingProxy)
    .register(UnhandledProxy)
    .publish(CalculatorService);

export const handler: LambdaHandler = container.export();
