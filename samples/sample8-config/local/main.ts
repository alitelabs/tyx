import { ExpressContainer } from "../../../src";

import { ConfigService } from "../services/config";
import { TimestampService } from "../services/timestamp";

import { Config } from "./config";

// Required for accessing Lambda via proxy on AWS
import AWS = require("aws-sdk");
AWS.config.region = "us-east-1";

let express = new ExpressContainer("tyx-sample8", "/demo")
    .register(ConfigService, Config)
    .publish(TimestampService);

express.start(5000);
