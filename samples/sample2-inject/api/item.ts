export const ItemApi = "item";

export interface ItemApi {
    produce(type: string): Promise<Item>;
}

export interface Item {
    service: string;
    id: string;
    name: string;
}