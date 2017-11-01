export const MortgageApi = "mortgage";

export interface MortgageApi {
    calculate(amount: number, nMonths: number, interestRate: number, precision: number): Promise<number>;
}