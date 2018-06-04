import { ApiMetadata } from "../metadata/api";
import { ServiceMetadata } from "../metadata/service";
import { ConsoleLogger } from "./console";



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

export namespace Logger {
    export const sys: Logger = new ConsoleLogger("tyx", "log");
    // TODO: Simplify
    export function get(emitter: object);
    export function get(logName: string, emitter?: any): Logger;
    export function get(logNameOrEmitter: string | object, emitter?: any): Logger {
        let logName: string;
        if (typeof logNameOrEmitter === "string") {
            logName = logNameOrEmitter;
        } else if (typeof logNameOrEmitter === "object") {
            let service = ServiceMetadata.get(logNameOrEmitter);
            let api = ApiMetadata.get(logNameOrEmitter);
            // let db = DatabaseMetadata.get(logNameOrEmitter);
            if (service) {
                logName = service.alias || service.target.name;
                emitter = logNameOrEmitter;
            } else if (api) {
                logName = api.alias || api.target.name;
                emitter = logNameOrEmitter;
            } else {
                logName = undefined;
                emitter = logNameOrEmitter;
            }
        }
        return new ConsoleLogger(logName || "<log>", emitter);
    }
}

