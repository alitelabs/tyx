
import {
    Service,
    Utils
} from "../../../src";

export const ToDoApi = "ToDoApi";

export interface ToDoApi extends Service {
    list(query: ToDoSearchQuery): Promise<ToDoItem[]>;
    insert(item: CreateNewToDoItem): Promise<ToDoItem>;
    delete(id: string): Promise<boolean>;
}

export interface ToDoSearchQuery {
    search?: string;
    orderBy?: "name" | "data";
}

export interface CreateNewToDoItem {
    title: string;
}

export class ToDoItem {
    public _id: string;
    public title: string;
    public done: boolean;

    constructor();
    constructor(title: string);
    constructor(title: string, done: boolean);
    constructor(title?: string, done: boolean = false) {
        this._id = Utils.uuid();
        this.title = title;
        this.done = done;
    }
}