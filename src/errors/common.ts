import { Exception } from '../decorators/exception';
import { HttpCode } from '../types/http';

export interface ApiErrorData {
  code: string;
  message: string;
  params?: Record<string, any>;
}

export class ApiError extends Error {
  public readonly code: HttpCode;
  public cause?: any;
  public proxy: boolean;

  public reason: ApiErrorData;
  public details: ApiErrorData[];

  public constructor(code?: HttpCode, message?: string, cause?: any) {
    super(message);

    const F = (this as any).constructor;
    F.prototype.name = F.name;
    Object.setPrototypeOf(this, F.prototype);

    ApiError.popStack(this, F === ApiError ? 1 : 2);

    this.code = code || 500;
    if (cause && process.env.LOG_LEVEL === "DEBUG") this.cause = cause;
  }

  public static builder(): ApiErrorBuilder {
    return new ApiErrorBuilder(this);
  }

  public static popStack(err: Error, lines: number) {
    if (process.env.LOG_LEVEL !== "DEBUG") {
      delete err.stack;
      return;
    }
    err.stack = err.stack.split('\n    at ')
      .filter((z, i) => { return i === 0 || i > lines; })
      .join('\n    at ');
  }

  public static serialize(err: ApiError) {
    const alt: Record<string, any> = {
      code: undefined,
      message: undefined,
      proxy: undefined,
      reason: undefined,
      details: undefined,
      cause: undefined,
      stack: undefined,
    };
    const ser = ApiError.serializeData(err);
    Object.assign(alt, ser);
    return alt;
  }

  public static serializeData(data: any): any {
    if (data === undefined || data === null) return null;
    let alt = data;
    if (Array.isArray(data)) {
      alt = [];
      data.forEach(e => alt.push(ApiError.serializeData(e)));
    } else if (data instanceof Date) {
      alt = data.toISOString();
    } else if (typeof data === 'object') {
      alt = {};
      Object.getOwnPropertyNames(data).forEach((key) => {
        const val = data[key];
        if (typeof val === 'object') {
          alt[key] = ApiError.serializeData(val);
        } else {
          alt[key] = data[key];
        }
      });
      if (data.constructor !== Object && process.env.LOG_LEVEL === "DEBUG") {
        alt['__class__'] = data.constructor.name;
      }
    }
    if (alt.code === 500 && process.env.LOG_LEVEL !== "DEBUG") alt.message = "Something went wrong, please try again later";
    return alt;
  }

  public static deserialize(json: any): ApiError | Error | any {
    if (!json.__class__) return json;

    let instance;
    const namespace: any = global;

    // Check if is custom exception
    if (json.__class__ === ApiError.name) {
      instance = new ApiError(json.code, json.message);
    } else if (Exception.ctors[json.__class__] && Exception.ctors[json.__class__] instanceof Function) {
      const ctor = Exception.ctors[json.__class__];
      instance = new ctor();
    } else if (namespace[json.__class__] && namespace[json.__class__] instanceof Function) {
      // Use global object which holds the exceptions
      const ctor = namespace[json.__class__];
      instance = new ctor();
    } else if (json.__class__ && (json.message || json.stack)) {
      instance = new ApiError(500);
    } else {
      // TODO: New ApiError wrapper ...
      // console.log(`Not registered exception ${json.__class__}`);
      return json;
    }

    for (const prop of Object.getOwnPropertyNames(json)) {
      if (prop === '__class__') continue;
      const val = json[prop];

      if (typeof val === 'object') {
        instance[prop] = ApiError.deserialize(val);
      } else {
        instance[prop] = val;
      }
    }
    return instance;
  }

  /**
   * Returns the full stack info form the exception
   *
   * @returns {string}
   */
  public fullStack(): string {
    return ApiError.fullStack(this);
  }

  /**
   * Returns the full stack for given exception
   *
   * @static
   * @param {Error} err
   * @returns {string}
   */
  public static fullStack(err: Error): string {
    const cause = (err as any)['cause'];
    if (cause) {
      return (err.stack + '\ncaused by: ' + ApiError.fullStack(cause));
    }
    return (err.stack);
  }

  public static wrap(error: ApiError | Error | string | any): ApiError {
    if (error instanceof ApiError) return error;
    let result: ApiError;
    if (error instanceof Error) {
      // tslint:disable-next-line:no-this-assignment
      const ctor: any = this;
      if (ctor === ApiError) {
        result = new ApiError(500, error.message, error);
      } else {
        result = new (ctor)(error.message, error);
      }
      ApiError.popStack(result, 1);
    } else {
      // tslint:disable-next-line:no-this-assignment
      const ctor: any = this;
      if (ctor === ApiError) {
        result = new ApiError(500, '' + error);
      } else {
        result = new (ctor)('' + error);
      }
      ApiError.popStack(result, 1);
    }
    return result;
  }
}

export class ApiErrorBuilder {
  private type: Function;

  private aMessage: string;
  private aCause: Error;

  private aReason: ApiErrorData;
  private details: ApiErrorData[];

  constructor(type: Function) {
    this.type = type;
  }

  public message(m: string): this {
    this.aMessage = m;
    return this;
  }

  public reason(code: string, message: string, params?: Record<string, any>): this {
    this.aReason = { code, message, params };
    return this;
  }

  public detail(code: string, message: string, params?: Record<string, any>): this {
    this.details = this.details || [];
    this.details.push({ code, message, params });
    return this;
  }

  public cause(c: Error): this {
    this.aCause = c;
    return this;
  }

  public count(): number {
    return this.details && this.details.length || 0;
  }

  public create(): ApiError {
    if (this.aReason) this.render(this.aReason);
    if (!this.aMessage && this.aReason) this.aMessage = this.aReason.message;
    if (this.details) this.details.forEach(d => this.render(d));

    const ctor: any = this.type;
    const err: ApiError = new (ctor)(this.aMessage);
    ApiError.popStack(err, 1);
    if (this.aCause) err.cause = this.aCause;
    if (this.aReason) err.reason = this.aReason;
    if (this.details) err.details = this.details;
    return err;
  }

  private render(data: ApiErrorData): void {
    if (data.message && data.params) {
      let msg = data.message;
      for (const name in data.params) {
        const val = data.params[name];
        msg = msg.replace(new RegExp(`{${name}}`, 'g'), val);
      }
      data.message = msg;
    }
  }
}
