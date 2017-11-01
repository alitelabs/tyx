import { LambdaContainer, LambdaHandler } from "../../../src";

import { ToDoRepository} from "../services/repository";
import { ToDoService } from "../services/todo";

export const container = new LambdaContainer("tyx_sample10")
    .register(ToDoRepository)
    .publish(ToDoService);

export const handler: LambdaHandler = container.export();

