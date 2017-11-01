import { Proxy, LambdaProxy } from "../../../src";
import { MissingApi } from "../api/missing";

@Proxy(MissingApi)
export class MissingProxy extends LambdaProxy implements MissingApi {
    public calculate(req: any): Promise<number> {
        return this.proxy(this.calculate, arguments);
    }
}