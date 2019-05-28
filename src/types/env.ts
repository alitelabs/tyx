
const UUID: string = require('uuid')();

export abstract class Env {
  public static get identity() {
    let id = Env.lambdaLogStreamName || UUID;
    id = id.substring(id.indexOf(']') + 1);
    if (id.length === 32) {
      id = id.substr(0, 8) + '-' +
        id.substr(8, 4) + '-' +
        id.substr(12, 4) + '-' +
        id.substr(16, 4) + '-' +
        id.substring(20);
    }
    return id;
  }

  public static get prefix() {
    return process.env.PREFIX;
  }

  public static get stage() {
    return process.env.PREFIX || process.env.STAGE && ('/' + process.env.STAGE) || 'default';
  }

  public static get logLevel(): string {
    return process.env.LOG_LEVEL;
  }

  public static get isOffline(): boolean {
    return process.env.IS_OFFLINE === 'true';
  }

  public static set isOffline(val: boolean) {
    process.env.IS_OFFLINE = (val === undefined || val === null) ? val as any : String(val);
  }

  public static get node() {
    return process.env.NODE_ENV;
  }

  public static get warmPoolKey() {
    return process.env.WARM_POOL_KEY;
  }

  public static get lambdaFunctionName() {
    return process.env.AWS_LAMBDA_FUNCTION_NAME || '<script>';
  }

  public static get lambdaFunctionVersion() {
    return process.env.AWS_LAMBDA_FUNCTION_VERSION || '$VER';
  }

  public static get lambdaLogStreamName() {
    return process.env.AWS_LAMBDA_LOG_STREAM_NAME || '<console>';
  }

  public static get waitForEmptyEventLoop() {
    return process.env.WAIT_FOR_EMPTY_EVENT_LOOP !== 'false';
  }
}
