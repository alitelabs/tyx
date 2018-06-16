import { LogLevel } from '../types/config';
import { Logger } from './logger';

export class ConsoleLogger implements Logger {
  protected logName: string;
  protected logEmitter: string;

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
  }

  public todo(msg: any, ...args: any[]): void {
    if (LogLevel.bellow(LogLevel.ALL)) return;
    const message = this.format('TODO', msg, args);
    console.log(message, ...args);
  }

  public fatal(msg: any, ...args: any[]): any {
    const err = msg;
    if (LogLevel.bellow(LogLevel.FATAL)) return err;
    const message = this.format('FATAL', msg, args);
    console.error(message, ...args);
    return err;
  }

  public error(msg: any, ...args: any[]): any {
    const err = msg;
    if (LogLevel.bellow(LogLevel.ERROR)) return err;
    const message = this.format('ERROR', msg, args);
    console.error(message, ...args);
    return err;
  }

  public info(msg: any, ...args: any[]): void {
    if (LogLevel.bellow(LogLevel.INFO)) return;
    const message = this.format('INFO', msg, args);
    console.info(message, ...args);
  }

  public warn(msg: any, ...args: any[]): void {
    if (LogLevel.bellow(LogLevel.WARN)) return;
    const message = this.format('WARN', msg, args);
    console.warn(message, ...args);
  }

  public debug(msg: any, ...args: any[]): void {
    if (LogLevel.bellow(LogLevel.DEBUG)) return;
    const message = this.format('DEBUG', msg, args);
    console.log(message, ...args);
  }

  public trace(msg: any, ...args: any[]): void {
    if (LogLevel.bellow(LogLevel.TRACE)) return;
    const message = this.format('TRACE', msg, args);
    console.trace(message, ...args);
  }

  public time(): [number, number] {
    return process.hrtime();
  }

  public timeEnd(start: [number, number], msg: any, ...args: any[]): void {
    const lapse = process.hrtime(start);
    const ms = lapse[0] * 1000 + Math.floor(lapse[1] / 1000000);
    const ns = Math.floor((lapse[1] % 1000000) / 1000);
    const message = this.format('TIME', msg, args) + ': ' + ms + '.' + ns + 'ms';
    console.log(message, ...args);
  }

  private format(type: string, message: any, args: any[]) {
    // https://docs.spring.io/spring-boot/docs/current/reference/html/boot-features-logging.html
    // let time = ""; // `[${new Date().toISOString()}] `;
    if (typeof message === 'object') { args.unshift(message); }
    return `${type} ${this.prefix} : ${message}`;
  }

  private get prefix(): string {
    return `[${this.logName}:${this.logEmitter}]`;
  }
}
