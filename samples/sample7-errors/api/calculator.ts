export const CalculatorApi = "calculator";

export interface CalculatorApi {
    mortgage(amount: any, nMonths: any, interestRate: any, precision: any): Promise<MortgageResponse>;
    missing(req: any): Promise<number>;
    unhandled(req: any): Promise<number>;
}

export interface MortgageResponse {
    monthlyPayment: number;
    total: number;
    totalInterest: number;
}