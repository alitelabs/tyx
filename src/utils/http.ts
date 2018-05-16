import { ApiError, BadRequest } from "../errors";
import { HttpCode, HttpContentType, HttpHeader, HttpMultipart, HttpRequest, HttpResponse } from "../types";

import Zlib = require("zlib");
import Utils = require("./misc");

export namespace HttpUtils {

    export function response(code: HttpCode, body: any, json?: boolean) {
        json = (json === undefined) ? true : json;
        if (typeof body !== "string") body = JSON.stringify(body);

        let response: HttpResponse = {
            statusCode: code,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH",
                "Access-Control-Allow-Headers": "Content-Type, Content-Encoding",
                "Access-Control-Expose-Headers": "Token",
                "Content-Type": json ? "application/json; charset=utf-8" : "text/plain; charset=utf-8"
            },
            body
        };
        if (!body) delete response.headers["Content-Type"];

        return response;
    }

    export function prepare(arg: HttpResponse): HttpResponse {
        let res = response(arg.statusCode, arg.body, true);
        Object.assign(res.headers, arg.headers || {});
        if (arg.contentType) res.headers["Content-Type"] = arg.contentType;
        return res;
    }

    export function error(error: Error): HttpResponse {
        let res: HttpResponse;
        if (error instanceof ApiError) {
            res = HttpUtils.response(error.code, ApiError.serialize(error), true);
        } else {
            // TODO: Always json
            res = HttpUtils.response(501, error.message || "Internal Server Error", false);
        }
        return res;
    }

    export function header(value: string): HttpHeader {
        let header: HttpHeader = { value: null, params: {} };
        if (!value) return header;

        let parts = value.split(";").map(t => t.trim()).filter(t => t);
        parts.map(part => {
            let p = part.split("=").map(t => t.trim());
            if (p.length === 2) {
                let k = p[0];
                let v = p[1];
                if (v.startsWith("\"") && v.endsWith("\"")) v = v.substring(1, v.length - 1);
                header.params[k] = v;
            } else if (!header.value) {
                header.value = part;
            } else {
                header.params[part] = part;
            }
        });
        return header;
    }

    export function contentType(headers: Record<string, string>, body: string): HttpContentType {
        let value = headers["Content-Type"] || headers["content-type"] || null;
        let res: HttpContentType = header(value);
        if (!res.value) return res;

        res.domainModel = res.params["domain-model"];
        res.isJson = res.value === "application/json";
        res.isMultipart = res.value.startsWith("multipart/");

        if (res.value === "application/x-www-form-urlencoded") {
            let boundary = body.substring(0, body.indexOf("\r\n"));
            if (body.endsWith("\r\n" + boundary + "--\r\n")) res.isMultipart = true;
        }

        return res;
    }

    export function body(req: HttpRequest) {
        // TODO: Parse content type and isBase64 encoding etc ...
        if (req.contentType.isJson) {
            try {
                req.json = JSON.parse(req.body || "{}");
            } catch (e) {
                throw new BadRequest("Invalid JSON body");
            }
            return;
        }

        if (req.contentType.isMultipart) {
            let lines = req.body.split("\r\n");
            let boudary = lines[0];

            let parts: HttpMultipart[] = [];

            let first = true;
            let inHeaders = false;
            let inBody = false;
            let rawHeaders: Record<string, string> = {};
            let headers: Record<string, HttpHeader> = {};
            let body = "";

            for (let line of lines) {
                if (line === boudary) {
                    if (!first) {
                        let ct = contentType(rawHeaders, body);
                        parts.push({ headers, body, contentType: ct });
                    }

                    inHeaders = true;
                    inBody = false;
                    headers = {};
                    rawHeaders = {};
                    body = "";
                    first = false;
                    continue;
                }

                if (line === (boudary + "--")) {
                    let ct = contentType(rawHeaders, body);
                    parts.push({ headers, body, contentType: ct });
                    continue;
                }

                if (inHeaders && line === "") {
                    inBody = true;
                    inHeaders = false;
                    continue;
                } else if (inHeaders) {
                    let key = line.substring(0, line.indexOf(":")).trim();
                    let val = line.substring(line.indexOf(":") + 1).trim();
                    headers[key] = header(val);
                    rawHeaders[key] = val;
                } else if (inBody) {
                    if (body) body += "\r\n";
                    body += line;
                }
            }

            req.multiparts = parts;
        }
    }

    export function canonicalHeaders(headers: Record<string, string>): Record<string, string> {
        let canon = {};
        Object.keys(headers).forEach(h => canon[h.toLowerCase()] = headers[h]);
        return canon;
    }

    export function extractFile(req: HttpRequest): any {
        let contentType = req.contentType.isMultipart ? req.multiparts[0].contentType : req.contentType;
        let body = req.contentType.isMultipart ? req.multiparts[0].body : req.body;
        if (contentType.value.startsWith("text/")) return this.parseCsv(body);
        if (contentType.value === "application/gzip"
            || contentType.value === "application/x-gzip"
            || contentType.value === "application/octet-stream") {
            let is64 = Utils.isBase64(body);
            let input = Buffer.from(body, is64 ? "base64" : "utf-8");
            let isGz = contentType.value.indexOf("gzip") > 0 || Utils.isGzip(input);
            let data = isGz ? Zlib.gunzipSync(input) : input;
            input = null;
            body = null;
            let content = data.toString();
            data = null;
            return content;
        }
        // TODO: octet-strema
        // multipart
        return null;
    }
}
