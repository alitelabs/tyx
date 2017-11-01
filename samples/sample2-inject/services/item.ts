
import {
    Service,
    ServiceMetadata,
    Private,
    Utils
} from "../../../src";

import {
    ItemApi,
    Item
} from "../api/item";

@Service(ItemApi)
export class ItemService implements ItemApi {

    @Private()
    public async produce(name: string): Promise<Item> {
        return {
            service: ServiceMetadata.service(this),
            id: Utils.uuid(),
            name
        };
    }
}