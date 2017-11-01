import { Proxy, LambdaProxy } from "../../../src";
import { MortgageApi } from "../api/mortgage";

@Proxy(MortgageApi)
export class MortgageProxy extends LambdaProxy implements MortgageApi {
    public calculate(amount: any, nMonths: any, interestRate: any): Promise<number> {
        return this.proxy(this.calculate, arguments);
    }
}