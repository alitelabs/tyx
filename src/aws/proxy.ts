
import { BaseProxy } from '../core/proxy';
import { InternalServerError } from '../errors';
import { Aws } from '../import';
import { ProxyMetadata } from '../metadata/proxy';
import { RemoteRequest } from '../types/proxy';
import { LambdaError } from './error';

export abstract class LambdaProxy extends BaseProxy {
  private lambda: Aws.Lambda;

  constructor() {
    super();
    this.lambda = new Aws.Lambda();
  }

  protected async token(call: RemoteRequest): Promise<string> {
    return await this.security.issueToken({
      audience: call.application,
      subject: call.type,
      userId: null,
      // TODO: Internal, External, Remote ???
      role: 'Application',
    });
  }

  protected async invoke(call: RemoteRequest): Promise<any> {
    const stage = call.type === 'remote'
      ? this.config.remoteStage(call.application)
      : this.config.stage;

    const meta = ProxyMetadata.get(this);
    let response: Aws.Lambda.InvocationResponse;
    try {
      response = await this.lambda.invoke({
        FunctionName: stage + '-' + meta.functionName,
        Payload: JSON.stringify(call),
      }).promise();
    } catch (err) {
      throw InternalServerError.wrap(err);
    }
    const result = JSON.parse(response.Payload.toString());
    if (response.FunctionError === 'Handled') {
      throw LambdaError.parse(result.errorMessage);
    } else if (response.FunctionError === 'Unhandled') {
      throw InternalServerError.wrap(result.errorMessage);
    } else {
      return result;
    }
  }
}
