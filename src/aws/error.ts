import { ApiError, InternalServerError } from "../errors";

export class LambdaError extends Error {
    constructor(error: any) {
        error = InternalServerError.wrap(error);
        super(JSON.stringify(ApiError.serialize(error)));

        let F = (this as any).constructor;
        F.prototype.name = F.name;
        Object.setPrototypeOf(this, F.prototype);
    }

    public static parse(error: string) {
        let err: ApiError = ApiError.deserialize(JSON.parse(error));
        err.proxy = true;
        return err;
    }
}