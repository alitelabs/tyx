import { config, SecretsManager } from 'aws-sdk';
import { CoreConfiguration } from '../core/config';
import { Activate, CoreService, Initialize } from '../decorators/service';

const LIFETIME = 120000;
// Temporary fix
config.region = config.region || 'eu-west-1';

class This {
  public static expiry: number;
  public static cache: Record<string, any>;
}

@CoreService()
export class SecretsManagerConfig extends CoreConfiguration {
  constructor(
    private names: string[]
  ) {
    super();
    this.names = ['core/http', 'core/internal', 'core/remote', ...names];
  }

  @Initialize()
  @Activate()
  public async activate() {
    // tslint:disable-next-line:variable-name
    if (This.expiry && This.expiry > Date.now()) return;
    This.expiry = Date.now() + LIFETIME;
    This.cache = This.cache || {};
    for (const name of this.names) {
      const id = `${this.appId}/${this.stage}/${name}`.toLowerCase();
      try {
        const data = await this.load(id);
        This.cache[id] = data;
      } catch (err) {
        throw err;
      }
    }
  }

  protected retrive(name: string) {
    return This.cache && This.cache[name.toLowerCase()];
  }

  private async load(id: string) {
    const client = new SecretsManager();
    let data: SecretsManager.GetSecretValueResponse;
    try {
      data = await client.getSecretValue({ SecretId: id }).promise();
    } catch (err) {
      if (err.code === 'DecryptionFailureException') {
        // Secrets Manager can't decrypt the protected secret text using the provided KMS key.
        throw err;
      } else if (err.code === 'InternalServiceErrorException') {
        // An error occurred on the server side.
        throw err;
      } else if (err.code === 'InvalidParameterException') {
        // You provided an invalid value for a parameter.
        throw err;
      } else if (err.code === 'InvalidRequestException') {
        // You provided a parameter value that is not valid for the current state of the resource.
        throw err;
      } else if (err.code === 'ResourceNotFoundException') {
        // We can't find the resource that you asked for.
        return undefined;
      } else {
        throw err;
      }
    }
    // Decrypts secret using the associated KMS CMK.
    // Depending on whether the secret is a string or binary, one of these fields will be populated.
    if ('SecretString' in data) {
      const secret = data.SecretString;
      return JSON.parse(secret);
    } else {
      const buff = Buffer.from(data.SecretBinary as any, 'base64');
      const decoded = buff.toString('ascii');
      return JSON.parse(decoded);
    }
  }
}
