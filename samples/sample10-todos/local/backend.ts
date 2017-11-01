import { ExpressContainer } from "../../../src";

import { ToDoRepository} from "../services/repository";
import { ToDoService } from "../services/todo";

// Required for accessing DynamoDB on AWS
import AWS = require("aws-sdk");
AWS.config.region = "us-east-1";

new ExpressContainer("tyx_sample10")
    .register(ToDoRepository)
    .publish(ToDoService)
    .start(5000);
