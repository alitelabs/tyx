import { Debug, Debugger } from 'exer';
import { LogLevel } from '../types/config';
import { Logger } from './logger';

export class DebugLogger implements Logger {
  protected logName: string;
  protected logEmitter: string;
  protected log: Debugger;

  constructor(logName: string, emitter?: any) {
    this.logName = logName;

    let n: string;
    if (emitter instanceof Function) {
      n = emitter.name;
    } else if (typeof emitter === 'string') {
      n = emitter;
    } else if (emitter && emitter.constructor instanceof Function) {
      n = emitter.constructor.name;
    } else {
      n = '' + (emitter || '<script>');
    }

    this.logEmitter = n;
    this.log = Debug(`${this.logName}:${this.logEmitter}`, true);
  }

  public todo(msg: any, ...args: any[]): void {
    if (LogLevel.bellow(LogLevel.ALL)) return;
  }

  public fatal(msg: any, ...args: any[]): any {
    const err = msg;
    if (LogLevel.bellow(LogLevel.FATAL)) return err;
    // const message = this.format('FATAL', msg, args);
    this.log.fatal(...arguments);
    return err;
  }

  public error(msg: any, ...args: any[]): any {
    const err = msg;
    if (LogLevel.bellow(LogLevel.ERROR)) return err;
    // const message = this.format('ERROR', msg, args);
    this.log.error(...arguments);
    return err;
  }

  public info(msg: any, ...args: any[]): void {
    if (LogLevel.bellow(LogLevel.INFO)) return;
    // const message = this.format('INFO', msg, args);
    this.log.info(...arguments);
  }

  public warn(msg: any, ...args: any[]): void {
    if (LogLevel.bellow(LogLevel.WARN)) return;
    // const message = this.format('WARN', msg, args);
    this.log.warn(...arguments);
  }

  public debug(msg: any, ...args: any[]): void {
    if (LogLevel.bellow(LogLevel.DEBUG)) return;
    // const message = this.format('DEBUG', msg, args);
    this.log.debug(...arguments);
  }

  public trace(msg: any, ...args: any[]): void {
    if (LogLevel.bellow(LogLevel.TRACE)) return;
    // const message = this.format('TRACE', msg, args);
    this.log.trace(...arguments);
  }

  public time(label?: string, ...args: any[]): [number, number] {
    return this.log.time(...arguments);
  }

  public timeEnd(start: string | [number, number], msg: any, ...args: any[]): void {
    if (LogLevel.bellow(LogLevel.INFO)) return void null;
    return void this.log.timeEnd(...arguments);
  }

  // TODO: Standard log format
  // https://docs.spring.io/spring-boot/docs/current/reference/html/boot-features-logging.html
}
