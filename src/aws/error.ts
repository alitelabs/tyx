import { ApiError, InternalServerError } from '../errors';

export class LambdaError extends Error {
  constructor(error: any) {
    // tslint:disable-next-line:no-parameter-reassignment
    error = InternalServerError.wrap(error);
    super(JSON.stringify(ApiError.serialize(error)));

    const F = (this as any).constructor;
    F.prototype.name = F.name;
    Object.setPrototypeOf(this, F.prototype);
  }

  public static parse(error: string) {
    const err: ApiError = ApiError.deserialize(JSON.parse(error));
    err.proxy = true;
    return err;
  }
}
