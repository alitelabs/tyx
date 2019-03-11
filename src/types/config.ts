// tslint:disable-next-line:variable-name
export const Configuration = 'Config';

export enum LogLevel {
  ALL = 0,
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5,
  OFF = 6,
}

export namespace LogLevel {
  let level: LogLevel = LogLevel.INFO;

  export function bellow(ofLevel: LogLevel) {
    return level > ofLevel;
  }

  export function set(toLevel: LogLevel): void {
    if (toLevel == null || toLevel === undefined) {
      level = LogLevel.OFF;
    } else {
      level = (LogLevel[toLevel as any] || LogLevel.INFO) as any;
    }
  }
}

export interface Configuration {
  appId: string;
  stage: string;
  prefix: string;

  database: string;

  logLevel: LogLevel;
  tracing: boolean;

  resources: Record<string, string>;
  aliases: Record<string, string>;

  httpSecret: string;
  httpTimeout: string;
  httpLifetime: string;
  httpStrictIpCheck: string;
  internalSecret: string;
  internalTimeout: string;
  remoteTimeout: string;

  remoteSecret(appId: string): string;
  remoteStage(appId: string): string;
}
