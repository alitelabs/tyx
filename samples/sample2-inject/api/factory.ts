import { Box } from "./box";
import { Item } from "./item";

export const FactoryApi = "factory";

export interface FactoryApi {
    produce(boxType: string, itemName: string): Promise<Product>;
}

export interface Product {
    service: string;
    timestamp: string;
    box: Box;
    item: Item;
}