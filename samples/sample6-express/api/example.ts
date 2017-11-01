import { Context, RestCall, RestResult } from "../../../src";

export const ExampleApi = "example";

export interface ExampleApi {
    hello(): string;
    onGet(ctx: Context, call: RestCall): Promise<RestResult>;
    onPost(ctx: Context, call: RestCall): Promise<RestResult>;
    other(ctx: Context, call: RestCall): Promise<RestResult>;
}