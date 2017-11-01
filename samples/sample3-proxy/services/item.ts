
import {
    Service,
    ServiceMetadata,
    Remote,
    Utils
} from "../../../src";

import {
    ItemApi,
    Item
} from "../api/item";

@Service(ItemApi)
export class ItemService implements ItemApi {

    @Remote()
    public async produce(name: string): Promise<Item> {
        return {
            service: ServiceMetadata.service(this),
            id: Utils.uuid(),
            name
        };
    }
}