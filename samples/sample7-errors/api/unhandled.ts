export const UnhandledApi = "unhandled";

export interface UnhandledApi {
    calculate(req: any): Promise<number>;
}