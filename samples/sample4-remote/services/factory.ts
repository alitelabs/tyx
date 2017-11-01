
import {
    Service,
    ServiceMetadata,
    Get,
    Public,
    Inject,
    QueryParam
} from "../../../src";

import {
    BoxApi,
    Box
} from "../api/box";

import {
    ItemApi,
    Item
} from "../api/item";

import {
    FactoryApi,
    Product
} from "../api/factory";

@Service(FactoryApi)
export class FactoryService implements FactoryApi {

    @Inject(BoxApi, "tyx-sample3")
    protected boxProducer: BoxApi;

    @Inject(ItemApi, "tyx-sample3")
    protected itemProducer: ItemApi;

    @Public()
    @Get("/product")
    public async produce(@QueryParam("box") boxType: string, @QueryParam("item") itemName: string): Promise<Product> {
        let box: Box = await this.boxProducer.produce(boxType);
        let item: Item = await this.itemProducer.produce(itemName || "item");
        return {
            service: ServiceMetadata.service(this),
            timestamp: new Date().toISOString(),
            box,
            item
        };
    }
}