
import { Service } from "../../../src";

import { ToDoItem } from "../api/todo";

import { DynamoDB } from "aws-sdk";

@Service()
export class ToDoRepository {

    private db: DynamoDB.DocumentClient;
    private TableName: string = "tyx-sample10-todos";
    /**
     *  inject db
     */
    constructor() {
        this.db = new DynamoDB.DocumentClient();
    }

    public async get(id: string): Promise<ToDoItem> {
        try {
            let gateResult = await this.db.get({
                TableName: this.TableName,
                Key: {
                    _id: id
                }
            }).promise();
            return gateResult.Item as ToDoItem;
        } catch (err) {
            console.log(err);
            throw err;
        }
    }

    public async getAll(): Promise<ToDoItem[]> {
        try {
            let items = await this.db.scan({ TableName: this.TableName }).promise();
            return items.Items as ToDoItem[];
        } catch (err) {
            console.log(err);
            throw err;
        }
    }

    public async insert(item: ToDoItem): Promise<ToDoItem> {
        try {
            await this.db.put(
                {
                    TableName: this.TableName,
                    Item: item
                }
            ).promise();
            return item;
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }

    public async update(item: ToDoItem) {
        try {
            await this.db.put(
                {
                    TableName: this.TableName,
                    Item: item
                }
            ).promise();
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }

    public async delete(id: string): Promise<boolean> {
        try {
            await this.db.delete({
                TableName: this.TableName,
                Key: {
                    _id: id
                }
            }).promise();
            return true;
        } catch (err) {
            console.log(err);
            return false;
        }
    }
}