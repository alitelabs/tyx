
import {
    Service,
    BaseService,
    Get,
    Put,
    Post,
    Delete,
    Public,
    Inject,
    Body,
    PathParam,
    QueryParams
} from "../../../src";

import {
    ToDoApi,
    ToDoSearchQuery,
    CreateNewToDoItem,
    ToDoItem
} from "../api/todo";

import {
    ToDoRepository
} from "./repository";


@Service(ToDoApi)
export class ToDoService extends BaseService implements ToDoApi {

    @Inject()
    private toDoRepository: ToDoRepository;

    @Public()
    @Get("/api/todos")
    public async list(@QueryParams() query: ToDoSearchQuery): Promise<ToDoItem[]> {
        return await this.toDoRepository.getAll();
    }


    @Public()
    @Post("/api/todos")
    public async insert(@Body() item: CreateNewToDoItem): Promise<ToDoItem> {
        return await this.toDoRepository.insert(new ToDoItem(item.title));
    }

    @Public()
    @Put("/api/todos/{id}")
    public async changeStatus(@PathParam("id") id: string) {

        let toDoItem = await this.toDoRepository.get(id);
        toDoItem.done = !toDoItem.done;

        await this.toDoRepository.update(toDoItem);
    }

    @Public()
    @Delete("/api/todos/{id}")
    public async delete(@PathParam("id") id: string): Promise<boolean> {
        return await this.toDoRepository.delete(id);
    }
}