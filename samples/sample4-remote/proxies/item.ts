import {
    Proxy,
    LambdaProxy
} from "../../../src";

import {
    ItemApi,
    Item
} from "../api/item";

@Proxy(ItemApi, "tyx-sample3")
export class ItemProxy extends LambdaProxy implements ItemApi {
    public async produce(name: string): Promise<Item> {
        return this.proxy(this.produce, arguments);
    }
}