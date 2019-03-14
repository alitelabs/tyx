import { CoreService } from '../decorators/service';
import { Configuration, LogLevel } from '../types/config';
import { Utils } from '../utils';

const REMOTE_STAGE_PREFIX = 'REMOTE_STAGE_';
const REMOTE_SECRET_PREFIX = 'REMOTE_SECRET_';

@CoreService(Configuration)
export class CoreConfiguration implements Configuration {

  // tslint:disable-next-line:variable-name
  private _appId: string;
  protected config: Record<string, any>;

  constructor() {
    this.config = process.env;
  }

  public init(appId: string) {
    this._appId = appId;
  }

  get appId(): string { return this._appId; }

  get stage(): string { return this.config.STAGE || 'local'; }

  get prefix(): string { return this.config.PREFIX || ('/' + this.stage); }

  get database(): string { return this.config.DATABASE; }

  get tracing(): boolean { return this.config.TRACING === 'true'; }

  get logLevel(): LogLevel {
    switch (this.config.LOG_LEVEL) {
      case 'ALL': return LogLevel.ALL;
      case 'TRACE': return LogLevel.TRACE;
      case 'DEBUG': return LogLevel.DEBUG;
      case 'INFO': return LogLevel.INFO;
      case 'WARN': return LogLevel.WARN;
      case 'ERROR': return LogLevel.ERROR;
      case 'FATAL': return LogLevel.FATAL;
      case 'OFF': return LogLevel.OFF;
      default: return LogLevel.INFO;
    }
  }

  get aliases(): Record<string, string> {
    const cfg = this.config.RESOURCES;
    if (!cfg) return {};
    const res = Utils.parseMap(cfg, '$');
    return res;
  }

  get resources(): Record<string, string> {
    const aliases = this.aliases;
    const res: Record<string, string> = {};
    for (const rsrc in aliases) res[aliases[rsrc]] = rsrc;
    return res;
  }

  get httpSecret(): string { return this.config.HTTP_SECRET || undefined; }

  get httpTimeout(): string { return this.config.HTTP_TIMEOUT || '10min'; }

  get httpLifetime(): string { return this.config.HTTP_LIFETIME || '1h'; }

  get httpStrictIpCheck(): string { return this.config.HTTP_STRICT_IP_CHECK || 'false'; }

  get internalSecret(): string { return this.config.INTERNAL_SECRET || undefined; }

  get internalTimeout(): string { return this.config.INTERNAL_TIMEOUT || '5s'; }

  get remoteTimeout(): string { return this.config.REMOTE_TIMEOUT || '5s'; }

  public remoteSecret(appId: string): string {
    if (!appId) return undefined;
    const id = appId && appId.split('-').join('_').toUpperCase();
    return this.config[REMOTE_SECRET_PREFIX + id];
  }

  public remoteStage(appId: string): string {
    if (!appId) return undefined;
    const id = appId && appId.split('-').join('_').toUpperCase();
    return this.config[REMOTE_STAGE_PREFIX + id];
  }
}
