export const BoxApi = "box";

export interface BoxApi {
    produce(type: string): Promise<Box>;
}

export interface Box {
    service: string;
    id: string;
    type: string;
}