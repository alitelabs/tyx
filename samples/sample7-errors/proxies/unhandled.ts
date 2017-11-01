import { Proxy, LambdaProxy } from "../../../src";
import { UnhandledApi } from "../api/unhandled";

@Proxy(UnhandledApi)
export class UnhandledProxy extends LambdaProxy implements UnhandledApi {
    public calculate(req: any): Promise<number> {
        return this.proxy(this.calculate, arguments);
    }
}