import {
    ExpressContainer,
    DefaultConfiguration
} from "../../../src";

import { LoginService } from "../services/login";
import { FactoryService } from "../services/factory";

import { Config } from "./config";

let express = new ExpressContainer("tyx-sample5", "/demo")
    .register(DefaultConfiguration, Config)
    .publish(LoginService)
    .publish(FactoryService);

express.start(5000);