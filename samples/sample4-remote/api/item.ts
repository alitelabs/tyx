export const ItemApi = "item";

export interface Item {
    service: string;
    id: string;
    name: string;
}

export interface ItemApi {
    produce(name: string): Promise<Item>;
}