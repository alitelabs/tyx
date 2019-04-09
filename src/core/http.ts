import { ApiError, BadRequest } from '../errors';
import { HttpCode, HttpContentType, HttpHeader, HttpMultipart, HttpRequest, HttpResponse } from '../types/http';
import { Utils } from '../utils';

import Zlib = require('zlib');

export namespace HttpUtils {
  export function response(code: HttpCode, body: any, json?: boolean): HttpResponse {
    // tslint:disable-next-line:no-parameter-reassignment
    json = (json === undefined) ? true : json;
    // tslint:disable-next-line:no-parameter-reassignment
    if (typeof body !== 'string') body = JSON.stringify(body);
    const res: HttpResponse = {
      statusCode: code,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH',
        'Access-Control-Allow-Headers': 'Content-Type, Content-Encoding',
        'Access-Control-Expose-Headers': 'Token',
        'Content-Type': json ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8',
      },
      body,
    };
    if (!body) delete res.headers['Content-Type'];
    return res;
  }

  export function prepare(arg: HttpResponse): HttpResponse {
    const res = response(arg.statusCode, arg.body, true);
    Object.assign(res.headers, arg.headers || {});
    if (arg.contentType) res.headers['Content-Type'] = arg.contentType;
    res.isBase64Encoded = arg.isBase64Encoded;
    return res;
  }

  export function error(err: Error): HttpResponse {
    let res: HttpResponse;
    if (err instanceof ApiError) {
      res = HttpUtils.response(err.code, ApiError.serialize(err), true);
    } else {
      // TODO: Always json
      res = HttpUtils.response(501, err.message || 'Internal Server Error', false);
    }
    return res;
  }

  export function header(value: string): HttpHeader {
    const hdr: HttpHeader = { value: null, params: {} };
    if (!value) return hdr;

    const parts = value.split(';').map(t => t.trim()).filter(t => t);
    parts.map((part) => {
      const p = part.split('=').map(t => t.trim());
      if (p.length === 2) {
        const k = p[0];
        let v = p[1];
        if (v.startsWith('"') && v.endsWith('"')) v = v.substring(1, v.length - 1);
        hdr.params[k] = v;
      } else if (!hdr.value) {
        hdr.value = part;
      } else {
        hdr.params[part] = part;
      }
    });
    return hdr;
  }

  export function contentType(headers: Record<string, string>, body: string): HttpContentType {
    const value = headers['Content-Type'] || headers['content-type'] || null;
    const res: HttpContentType = header(value);
    if (!res.value) return res;
    res.domainModel = res.params['domain-model'];
    res.isJson = res.value === 'application/json';
    res.isMultipart = res.value.startsWith('multipart/');
    if (res.value === 'application/x-www-form-urlencoded') {
      const boundary = body.substring(0, body.indexOf('\r\n'));
      if (body.endsWith('\r\n' + boundary + '--\r\n')) res.isMultipart = true;
    }
    return res;
  }

  export function request(req: HttpRequest): HttpRequest {
    req.contentType = req.contentType || contentType(req.headers, req.body);
    // TODO: isBase64 encoding etc ...
    if (req.contentType.isJson) {
      try {
        req.json = JSON.parse(req.body || '{}');
      } catch (e) {
        throw new BadRequest('Invalid JSON body');
      }
      return req;
    }

    if (req.contentType.isMultipart) {
      const lines = req.body.split('\r\n');
      const boudary = lines[0];

      const parts: HttpMultipart[] = [];

      let first = true;
      let inHeaders = false;
      let inBody = false;
      let rawHeaders: Record<string, string> = {};
      let headers: Record<string, HttpHeader> = {};
      let body = '';

      for (const line of lines) {
        if (line === boudary) {
          if (!first) {
            const ct = contentType(rawHeaders, body);
            parts.push({ headers, body, contentType: ct });
          }

          inHeaders = true;
          inBody = false;
          headers = {};
          rawHeaders = {};
          body = '';
          first = false;
          continue;
        }

        if (line === (boudary + '--')) {
          const ct = contentType(rawHeaders, body);
          parts.push({ headers, body, contentType: ct });
          continue;
        }

        if (inHeaders && line === '') {
          inBody = true;
          inHeaders = false;
          continue;
        } else if (inHeaders) {
          const key = line.substring(0, line.indexOf(':')).trim();
          const val = line.substring(line.indexOf(':') + 1).trim();
          headers[key] = header(val);
          rawHeaders[key] = val;
        } else if (inBody) {
          if (body) body += '\r\n';
          body += line;
        }
      }
      req.multiparts = parts;
    }
    return req;
  }

  export function canonicalHeaders(headers: Record<string, string>): Record<string, string> {
    const canon: Record<string, string> = {};
    Object.keys(headers).forEach(h => canon[h.toLowerCase()] = headers[h]);
    return canon;
  }

  export function extractFile(req: HttpRequest): any {
    const ct = req.contentType.isMultipart ? req.multiparts[0].contentType : req.contentType;
    let body = req.contentType.isMultipart ? req.multiparts[0].body : req.body;
    // TODO: handle csv
    if (ct.value.startsWith('text/')) return body;
    if (ct.value === 'application/gzip'
      || ct.value === 'application/x-gzip'
      || ct.value === 'application/octet-stream') {
      const is64 = Utils.isBase64(body);
      let input = Buffer.from(body, is64 ? 'base64' : 'utf-8');
      const isGz = ct.value.indexOf('gzip') > 0 || Utils.isGzip(input);
      let data = isGz ? Zlib.gunzipSync(input) : input;
      input = null;
      body = null;
      const content = data.toString();
      data = null;
      return content;
    }
    // TODO: octet-strema
    // multipart
    return null;
  }
}
