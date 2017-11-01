import {
    Service,
    Remote,
    BadRequest
} from "../../../src";

import { MortgageApi } from "../api/mortgage";

@Service(MortgageApi)
export class MortgageService implements MortgageApi {

    @Remote()
    public async calculate(amount: number, nMonths: number, interestRate: number, precision: number = 5): Promise<number> {

        // Range validation
        let errors = BadRequest.builder();
        if (amount <= 0) errors.detail("amount", "Amount must be grater than zero." );
        if (nMonths <= 0) errors.detail("nMonths", "Number of months  must be grater than zero.");
        if (interestRate <= 0) errors.detail("interestRate", "Interest rate must be grater than zero.");
        if (errors.count()) throw errors.reason("mortgage.calculate.validation", "Invalid parameters values").create();

        interestRate = interestRate / 100 / 12;
        let x = Math.pow(1 + interestRate, nMonths);
        return +((amount * x * interestRate) / (x - 1)).toFixed(precision);
    }
}