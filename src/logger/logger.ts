import { Utils } from 'exer';
import { ApiMetadata } from '../metadata/api';
import { ServiceMetadata } from '../metadata/service';
import { ConsoleLogger } from './console';

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

/**
 * Injects logger into a class property or constructor parameter.
 */
// tslint:disable-next-line:function-name
// export function Logger(): PropertyDecorator | ParameterDecorator | any {
//   return Inject(alias => 'Logger');
// }

export namespace Logger {
  export const sys: Logger = new ConsoleLogger('tyx', 'log');
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
    return new ConsoleLogger(logName || '<log>', emitter);
  }
}
