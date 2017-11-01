export const MissingApi = "missing";

export interface MissingApi {
    calculate(req: any): Promise<number>;
}