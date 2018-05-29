import { Exception } from "../decorators/exception";
import { HttpCode } from "../types/http";

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

        let F = (this as any).constructor;
        F.prototype.name = F.name;
        Object.setPrototypeOf(this, F.prototype);

        ApiError.popStack(this, F === ApiError ? 1 : 2);

        this.code = code || 500;
        if (cause) this.cause = cause;
    }

    public static builder(): ApiErrorBuilder {
        return new ApiErrorBuilder(this);
    }

    public static popStack(err: Error, lines: number) {
        err.stack = err.stack.split("\n    at ")
            .filter((z, i) => { return i === 0 || i > lines; })
            .join("\n    at ");
    }

    public static serialize(err: ApiError) {
        let alt = {
            code: undefined,
            message: undefined,
            proxy: undefined,
            reason: undefined,
            details: undefined,
            cause: undefined,
            stack: undefined
        };
        let ser = ApiError.serializeData(err);
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
        } else if (typeof data === "object") {
            alt = {};
            Object.getOwnPropertyNames(data).forEach(key => {
                let val = data[key];
                if (typeof val === "object") {
                    alt[key] = ApiError.serializeData(val);
                } else {
                    alt[key] = data[key];
                }
            });
            if (data.constructor !== Object)
                alt["__class__"] = data.constructor.name;
        }
        return alt;
    }

    public static deserialize(json: any): ApiError | Error | any {
        if (!json.__class__) return json;

        let instance;

        // Check if is custom exception
        if (json.__class__ === ApiError.name) {
            instance = new ApiError(json.code, json.message);
        } else if (Exception.ctors[json.__class__] && Exception.ctors[json.__class__] instanceof Function) {
            let ctor = Exception.ctors[json.__class__];
            instance = new ctor();
        } else if (global[json.__class__] && global[json.__class__] instanceof Function) {
            // Use global object which holds the exceptions
            let ctor = global[json.__class__];
            instance = new ctor();
        } else if (json.__class__ && (json.message || json.stack)) {
            instance = new ApiError(500);
        } else {
            // TODO: New ApiError wrapper ...
            // console.log(`Not registered exception ${json.__class__}`);
            return json;
        }

        for (let prop of Object.getOwnPropertyNames(json)) {
            if (prop === "__class__") continue;
            let val = json[prop];

            if (typeof val === "object") {
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
        let cause = err["cause"];
        if (cause) {
            return (err.stack + "\ncaused by: " + ApiError.fullStack(cause));
        }
        return (err.stack);
    }

    public static wrap(error: ApiError | Error | string | any): ApiError {
        if (error instanceof ApiError) return error;
        let result: ApiError;
        if (error instanceof Error) {
            let ctor: any = this;
            if (ctor === ApiError)
                result = new ApiError(500, error.message, error);
            else
                result = new (ctor)(error.message, error);
            ApiError.popStack(result, 1);
        } else {
            let ctor: any = this;
            if (ctor === ApiError)
                result = new ApiError(500, "" + error);
            else
                result = new (ctor)("" + error);
            ApiError.popStack(result, 1);
        }
        return result;
    }
}

export class ApiErrorBuilder {
    private _type: Function;

    private _message: string;
    private _cause: Error;

    private _reason: ApiErrorData;
    private _details: ApiErrorData[];

    constructor(type: Function) {
        this._type = type;
    }

    public message(m: string): this {
        this._message = m;
        return this;
    }

    public reason(code: string, message: string, params?: Record<string, any>): this {
        this._reason = { code, message, params };
        return this;
    }

    public detail(code: string, message: string, params?: Record<string, any>): this {
        this._details = this._details || [];
        this._details.push({ code, message, params });
        return this;
    }

    public cause(c: Error): this {
        this._cause = c;
        return this;
    }

    public count(): number {
        return this._details && this._details.length || 0;
    }

    public create(): ApiError {
        if (this._reason) this.render(this._reason);
        if (!this._message && this._reason) this._message = this._reason.message;
        if (this._details) this._details.forEach(d => this.render(d));

        let ctor: any = this._type;
        let err: ApiError = new (ctor)(this._message);
        ApiError.popStack(err, 1);
        if (this._cause) err.cause = this._cause;
        if (this._reason) err.reason = this._reason;
        if (this._details) err.details = this._details;
        return err;
    }

    private render(data: ApiErrorData): void {
        if (data.message && data.params) {
            let msg = data.message;
            for (let name in data.params) {
                let val = data.params[name];
                msg = msg.replace(new RegExp(`{${name}}`, "g"), val);
            }
            data.message = msg;
        }
    }
}
