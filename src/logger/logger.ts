import { Utils } from 'exer';
import { Di } from '../import';
import { ApiMetadata } from '../metadata/api';
import { ServiceMetadata } from '../metadata/service';
import { DebugLogger } from './debug';

export interface Logger {
  todo(message: any, ...args: any[]): void;
  fatal(message: any, ...args: any[]): any;
  error(message: any, ...args: any[]): any;
  info(message: any, ...args: any[]): void;
  warn(message: any, ...args: any[]): void;
  debug(message: any, ...args: any[]): void;
  trace(message: any, ...args: any[]): void;
  time(): [number, number];
  time(label: string, message?: any, ...args: any[]): [number, number];
  timeEnd(start: [number, number], message: any, ...args: any[]): void;
  timeEnd(label: string, message: any, ...args: any[]): void;
}

/**
 * Injects logger into a class property or constructor parameter.
 */
// tslint:disable-next-line:function-name
export function Logger(logName?: string, emitter?: string): Function {
  return (target: Object, propertyKey: string | symbol, index?: number) => {
    if (target.constructor && target.constructor.prototype === target) {
      Di.Container.registerHandler({
        object: target,
        propertyName: propertyKey as string,
        index,
        value: () => logName ? Logger.get(logName, emitter) : Logger.get(target)
      });
    } else {
      (target as any)[propertyKey] = Logger.get(logName, emitter);
    }
  };
}

export namespace Logger {
  // export const sys: Logger = new DebugLogger('tyx', 'log');
  // TODO: Simplify, remove depenency on metadata
  export function get(emitter: object): Logger;
  export function get(logName: string, emitter?: any): Logger;
  export function get(logNameOrEmitter: string | object, emit?: any): Logger {
    let logName: string;
    let emitter = emit;
    if (typeof logNameOrEmitter === 'string') {
      logName = logNameOrEmitter;
    } else if (logNameOrEmitter instanceof ServiceMetadata) {
      logName = logNameOrEmitter.alias;
      emitter = logNameOrEmitter.name;
    } else if (logNameOrEmitter instanceof ApiMetadata) {
      logName = logNameOrEmitter.alias;
      emitter = logNameOrEmitter.name;
    } else if (typeof logNameOrEmitter === 'object' || Utils.isClass(logNameOrEmitter)) {
      const service = ServiceMetadata.get(logNameOrEmitter);
      const api = ApiMetadata.get(logNameOrEmitter);
      // let db = DatabaseMetadata.get(logNameOrEmitter);
      if (service) {
        logName = service.alias || service.name;
        emitter = logNameOrEmitter;
      } else if (api) {
        logName = api.name || api.name;
        emitter = logNameOrEmitter;
      } else {
        logName = undefined;
        emitter = logNameOrEmitter;
      }
    }
    return new DebugLogger(logName || '<log>', emitter);
  }
}
