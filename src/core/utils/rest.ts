import "../env";

import {
    RestCall,
    RestHeader,
    RestContentType,
    RestMultipart
} from "../types";

import {
    BadRequest
} from "../errors";

export namespace RestUtils {

    export function header(value: string): RestHeader {
        let header: RestHeader = { value: null, params: {} };
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

    export function contentType(headers: Record<string, string>, body: string): RestContentType {
        let value = headers["Content-Type"] || headers["content-type"] || null;
        let res: RestContentType = header(value);
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

    export function body(call: RestCall) {
        // TODO: Parse content type and isBase64 encoding etc ...
        if (call.contentType.isJson) {
            // if (typeof call.body === "object") {
            //     call.json = call.body;
            //     call.body = JSON.stringify(call.body);
            //     return;
            // }
            try {
                call.json = JSON.parse(call.body || "{}");
            } catch (e) {
                throw new BadRequest("Invalid JSON body");
            }
            return;
        }

        if (call.contentType.isMultipart) {
            let lines = call.body.split("\r\n");
            let boudary = lines[0];

            let parts: RestMultipart[] = [];

            let first = true;
            let inHeaders = false;
            let inBody = false;
            let rawHeaders: Record<string, string> = {};
            let headers: Record<string, RestHeader> = {};
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

            call.multiparts = parts;
        }
    }

    export function canonicalHeaders(headers: Record<string, string>): Record<string, string> {
        let canon = {};
        Object.keys(headers).forEach(h => canon[h.toLowerCase()] = headers[h]);
        return canon;
    }
}
