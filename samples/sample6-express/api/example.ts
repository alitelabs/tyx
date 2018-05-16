import { Context, HttpCall, HttpResponse } from "../../../src";

export const ExampleApi = "example";

export interface ExampleApi {
    hello(): string;
    onGet(ctx: Context, call: HttpCall): Promise<HttpResponse>;
    onPost(ctx: Context, call: HttpCall): Promise<HttpResponse>;
    other(ctx: Context, call: HttpCall): Promise<HttpResponse>;
}