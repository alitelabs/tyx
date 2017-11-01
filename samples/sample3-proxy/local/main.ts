import {
    ExpressContainer,
    DefaultConfiguration
} from "../../../src";

import { BoxProxy } from "../proxies/box";
import { ItemProxy } from "../proxies/item";
import { FactoryService } from "../services/factory";

import { Config } from "./config";

// Required for accessing Lambda via proxy on AWS
import AWS = require("aws-sdk");
AWS.config.region = "us-east-1";

let express = new ExpressContainer("tyx-sample3")
    .register(DefaultConfiguration, Config)
    .register(BoxProxy)
    .register(ItemProxy)
    .publish(FactoryService);

express.start(5000);