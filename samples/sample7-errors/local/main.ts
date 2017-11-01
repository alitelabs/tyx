import {
    ExpressContainer,
    DefaultConfiguration
} from "../../../src";

import { CalculatorService } from "../services/calculator";
import { MortgageProxy } from "../proxies/mortgage";
import { MissingProxy } from "../proxies/missing";
import { UnhandledProxy } from "../proxies/unhandled";

import { Config } from "./config";

// Required for accessing Lambda via proxy on AWS
import AWS = require("aws-sdk");
AWS.config.region = "us-east-1";

let express = new ExpressContainer("tyx-sample7", "/demo")
    .register(DefaultConfiguration, Config)
    .register(MortgageProxy)
    .register(MissingProxy)
    .register(UnhandledProxy)
    .publish(CalculatorService);

express.start(5000);
