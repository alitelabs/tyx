import { Utils } from 'exer';
import { Activate, CoreService } from '../decorators/service';
import { Logger } from '../logger';
import { Configuration, LogLevel } from '../types/config';
import { Core } from './core';

@CoreService(Configuration)
export class CoreConfiguration implements Configuration {

  @Logger()
  protected log: Logger;

  @Activate()
  public activate() {
  }

  get appId(): string { return Core.config.application; }
  get stage(): string { return Core.config.stage; }
  get prefix(): string { return ('/' + this.stage); }

  public database(alias: string): string {
    return this.secret('db', alias);
  }

  get logLevel(): LogLevel {
    const level = this.setting('app', 'log', 'level');
    switch (level) {
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

  get tracing(): boolean { return this.setting('core', 'graphql', 'tracing') === 'true'; }

  get aliases(): Record<string, string> {
    const cfg = this.setting('core', 'resources');
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

  get httpSecret(): string { return this.secret('core', 'http', 'secret'); }
  get httpTimeout(): string { return this.secret('core', 'http', 'timeout') || '10min'; }
  get httpLifetime(): string { return this.secret('core', 'http', 'lifetime') || '1h'; }
  get httpStrictIpCheck(): string { return this.secret('core', 'http', 'strictIpCheck') || 'false'; }

  get internalSecret(): string { return this.secret('core', 'internal', 'secret') || undefined; }
  get internalTimeout(): string { return this.secret('core', 'internal', 'timeout') || '5s'; }

  get remoteTimeout(): string { return this.secret('core', 'remote', 'timeout') || '5s'; }
  public remoteSecret(appId: string): string { return appId && this.secret('core', 'remote', 'secret', appId); }
  public remoteStage(appId: string): string { return appId && this.secret('core', 'remote', 'stage', appId); }

  get warmer() {
    return {
      key: this.setting('service', 'warmPool', 'key') || 'WARM_POOL_KEY',
      step: Number(this.setting('service', 'warmPool', 'step') || 100),
      flush: Number(this.setting('service', 'warmPool', 'flush') || 15) * 60000,
      rate: Number(this.setting('service', 'warmPool', 'flush') || 2) * 60000
    };
  }

  public static envKey(group: 'core' | 'app' | 'db' | 'service' | 'dev', name: string, key?: string, prop?: string) {
    let env = name + (key ? ('_' + key) + (prop ? ('_' + prop) : '') : '');
    env = (group === 'dev' ? 'DEV_' : '') + Utils.snakeCase(env).toUpperCase();
    return env;
  }

  public static nameKey(group: 'core' | 'app' | 'db' | 'service' | 'dev', name: string) {
    const obj = `${Core.config.application}/${Core.config.stage}/${group}/${name}`;
    return obj;
  }

  public static objKey(group: 'core' | 'app' | 'db' | 'service' | 'dev', name: string, key?: string, prop?: string) {
    const obj = `${Core.config.application}/${Core.config.stage}/${group}/${name}${key ? ':' + key : ''}${prop ? '.' + prop : ''}`;
    return obj;
  }

  protected secret<T = string>(group: 'core' | 'app' | 'db' | 'service', name: string, key?: string, prop?: string): T {
    const path = CoreConfiguration.nameKey(group, name);
    const env = CoreConfiguration.envKey(group, name, key, prop);
    const tmp = CoreConfiguration.objKey(group, name, key, prop);
    const data = this.retrive(path);
    this.log.debug('Retrive secret:', tmp);
    if (data) {
      return key ? (prop ? data[key] && data[key][prop] : data[key]) : data;
    } else {
      return process.env[env] as any;
    }
  }

  protected setting<T = string>(group: 'core' | 'app' | 'dev' | 'service', name: string, key?: string, prop?: string): T {
    const env = CoreConfiguration.envKey(group, name, key, prop);
    const obj = CoreConfiguration.objKey(group, name, key, prop);
    this.log.debug('Retrive secret:', obj);
    return process.env[env.toUpperCase()] as any;
  }

  protected retrive(obj: string): any {
    return undefined;
  }
}
