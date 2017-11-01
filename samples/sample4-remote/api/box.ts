export const BoxApi = "box";

export interface Box {
    service: string;
    id: string;
    type: string;
}

export interface BoxApi {
    produce(type: string): Promise<Box>;
}