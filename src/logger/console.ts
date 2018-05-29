import { LogLevel } from "../types";
import { Logger } from "./logger";

export class ConsoleLogger implements Logger {
    protected _logName: string;
    protected _logEmitter: string;

    constructor(logName: string, emitter?: any) {
        this._logName = logName;

        let n: string;
        if (emitter instanceof Function) {
            n = emitter.name;
        } else if (typeof emitter === "string") {
            n = emitter;
        } else if (emitter && emitter.constructor instanceof Function) {
            n = emitter.constructor.name;
        } else {
            n = "" + (emitter || "<script>");
        }

        this._logEmitter = n;
    }

    public todo(message: any, ...args: any[]): void {
        if (LogLevel.bellow(LogLevel.ALL)) return;
        message = this.format("TODO", message);
        console.log(message, ...args);
    }

    public fatal(message: any, ...args: any[]): any {
        let err = message;
        if (LogLevel.bellow(LogLevel.FATAL)) return err;
        message = this.format("FATAL", message);
        console.error(message, ...args);
        return err;
    }

    public error(message: any, ...args: any[]): any {
        let err = message;
        if (LogLevel.bellow(LogLevel.ERROR)) return err;
        message = this.format("ERROR", message);
        console.error(message, ...args);
        return err;
    }

    public info(message: any, ...args: any[]): void {
        if (LogLevel.bellow(LogLevel.INFO)) return;
        message = this.format("INFO", message);
        console.info(message, ...args);
    }

    public warn(message: any, ...args: any[]): void {
        if (LogLevel.bellow(LogLevel.WARN)) return;
        message = this.format("WARN", message);
        console.warn(message, ...args);
    }

    public debug(message: any, ...args: any[]): void {
        if (LogLevel.bellow(LogLevel.DEBUG)) return;
        message = this.format("DEBUG", message);
        console.log(message, ...args);
    }

    public trace(message: any, ...args: any[]): void {
        if (LogLevel.bellow(LogLevel.TRACE)) return;
        message = this.format("TRACE", message);
        console.trace(message, ...args);
    }

    public time(): [number, number] {
        return process.hrtime();
    }

    public timeEnd(start: [number, number], message: any, ...args: any[]): void {
        let lapse = process.hrtime(start);
        let ms = lapse[0] * 1000 + Math.floor(lapse[1] / 1000000);
        let ns = Math.floor((lapse[1] % 1000000) / 1000);
        message = this.format("TIME", message) + ": " + ms + "." + ns + "ms";
        console.log(message, ...args);
    }

    private format(type: string, message: any) {
        // https://docs.spring.io/spring-boot/docs/current/reference/html/boot-features-logging.html
        // let time = ""; // `[${new Date().toISOString()}] `;
        return `${type} ${this.prefix} : ${message}`;
    }

    private get prefix(): string {
        return `[${this._logName}:${this._logEmitter}]`;
    }
}