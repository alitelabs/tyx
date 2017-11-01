import {
    Service,
    ServiceMetadata,
    Remote,
    Utils
} from "../../../src";

import {
    BoxApi,
    Box
} from "../api/box";

@Service(BoxApi)
export class BoxService implements BoxApi {

    private type: string;

    constructor(type: string) {
        this.type = type || "default";
    }

    @Remote()
    public async produce(type: string): Promise<Box> {
        return {
            service: ServiceMetadata.service(this),
            id: Utils.uuid(),
            type: type || this.type
        };
    }
}