export const Configuration = "config";

export enum LogLevel {
    ALL = 0,
    TRACE = 0,
    DEBUG = 1,
    INFO = 2,
    WARN = 3,
    ERROR = 4,
    FATAL = 5,
    OFF = 6
}

export namespace LogLevel {
    let _level: LogLevel = LogLevel.INFO;

    export function bellow(level: LogLevel) {
        return _level > level;
    }

    export function set(level: LogLevel): void {
        if (level == null || level === undefined)
            _level = LogLevel.OFF;
        else
            _level = level;
    }
}

export interface Configuration {
    appId: string;
    stage: string;

    database: string;

    logLevel: LogLevel;
    resources: Record<string, string>;
    aliases: Record<string, string>;

    httpSecret: string;
    httpTimeout: string;
    httpLifetime: string;
    internalSecret: string;
    internalTimeout: string;
    remoteTimeout: string;

    remoteSecret(appId: string): string;
    remoteStage(appId: string): string;
}