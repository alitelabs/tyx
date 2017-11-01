import {
    Proxy,
    LambdaProxy
} from "../../../src";

import {
    BoxApi,
    Box
} from "../api/box";

@Proxy(BoxApi)
export class BoxProxy extends LambdaProxy implements BoxApi {
    public async produce(type: string): Promise<Box> {
        return this.proxy(this.produce, arguments);
    }
}