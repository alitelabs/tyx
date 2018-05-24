import { Inject } from "../metadata";
import { ConsoleLogger } from "./console";

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

export interface Logger {
    todo(message: any, ...args: any[]): void;
    fatal(message: any, ...args: any[]): any;
    error(message: any, ...args: any[]): any;
    info(message: any, ...args: any[]): void;
    warn(message: any, ...args: any[]): void;
    debug(message: any, ...args: any[]): void;
    trace(message: any, ...args: any[]): void;
    time(): [number, number];
    timeEnd(start: [number, number], message: any, ...args: any[]): void;
}


export function Logger(): PropertyDecorator {
    return Inject("logger");
}

export namespace Logger {
    export const sys: Logger = new ConsoleLogger("tyx", "log");
    // TODO: Simplify
    export function get(logName: string, emitter?: any): Logger {
        return new ConsoleLogger(logName || "<log>", emitter);
    }
}

