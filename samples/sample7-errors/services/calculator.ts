import {
    Service,
    Post,
    Public,
    Inject,
    Body,
    BodyParam,
    BadRequest,
    ApiErrorBuilder
} from "../../../src";

import { CalculatorApi, MortgageResponse } from "../api/calculator";
import { MortgageApi } from "../api/mortgage";
import { MissingApi } from "../api/missing";
import { UnhandledApi } from "../api/unhandled";


@Service(CalculatorApi)
export class CalculatorService implements CalculatorApi {

    @Inject(MortgageApi)
    protected mortgageService: MortgageApi;

    @Inject(MissingApi)
    protected missingService: MissingApi;

    @Inject(UnhandledApi)
    protected unhandledService: UnhandledApi;

    @Public()
    @Post("/mortgage")
    public async mortgage( @BodyParam("amount") amount: any,
        @BodyParam("nMonths") nMonths: any,
        @BodyParam("interestRate") interestRate: any,
        @BodyParam("precision") precision: any): Promise<MortgageResponse> {

        let _amount = Number.parseFloat(amount);
        let _nMonths = Number.parseFloat(nMonths);
        let _interestRate = Number.parseFloat(interestRate);
        let _precision = precision && Number.parseFloat(precision);

        // Type validation
        let errors: ApiErrorBuilder = BadRequest.builder();
        if (!Number.isFinite(_amount)) errors.detail("amount", "Amount required and must be a number, got: {input}.", { input: amount || null });
        if (!Number.isInteger(_nMonths)) errors.detail("nMonths", "Number of months required and must be a integer, got: {input}.", { input: nMonths || null });
        if (!Number.isFinite(_interestRate)) errors.detail("interestRate", "Interest rate required and must be a number, got: {input}.", { input: interestRate || null });
        if (_precision && !Number.isInteger(_precision)) errors.detail("precision", "Precision must be an integer, got: {input}.", { input: precision || null });
        if (errors.count()) throw errors.reason("calculator.mortgage.validation", "Parameters validation failed").create();

        let monthlyPayment = await this.mortgageService.calculate(_amount, _nMonths, _interestRate, _precision);

        return {
            monthlyPayment,
            total: monthlyPayment * _nMonths,
            totalInterest: (monthlyPayment * _nMonths) - _amount
        };
    }

    @Public()
    @Post("/missing")
    public async missing( @Body() req: any): Promise<number> {
        return this.missingService.calculate(req);
    }

    @Public()
    @Post("/unhandled")
    public async unhandled( @Body() req: any): Promise<number> {
        return this.unhandledService.calculate(req);
    }
}