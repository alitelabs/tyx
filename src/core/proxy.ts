import { Inject } from '../decorators/service';
import { Logger } from '../logger';
import { ProxyMetadata } from '../metadata/proxy';
import { Configuration } from '../types/config';
import { RemoteRequest } from '../types/proxy';
import { Security } from '../types/security';

export abstract class BaseProxy {

  public readonly log: Logger;

  @Inject(Configuration)
  protected config: Configuration;

  @Inject(Security)
  protected security: Security;

  constructor() {
    this.log = Logger.get('proxy', this);
  }

  protected async proxy(method: Function, params: IArguments): Promise<any> {
    const startTime = this.log.time();
    try {
      let type: ('remote' | 'internal') = 'remote';
      const meta = ProxyMetadata.get(this);
      const appId = meta.application || this.config.appId;
      if (this.config.appId === appId) type = 'internal';
      const call: RemoteRequest = {
        type,
        application: appId,
        service: meta.name,
        method: method.name,
        requestId: undefined,
        token: undefined,
        args: [],
      };
      for (let i = 0; i < params.length; i++) {
        call.args[i] = params[i];
      }
      call.token = await this.token(call);
      const response = await this.invoke(call);
      return response;
    } catch (e) {
      throw e;
    } finally {
      this.log.timeEnd(startTime, `${method.name}`);
    }
  }

  protected abstract async token(call: RemoteRequest): Promise<string>;

  protected abstract async invoke(call: RemoteRequest): Promise<any>;
}
