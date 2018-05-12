import "../env";

import {
    Context,
    IssueRequest,
    WebToken,
    RestCall,
    RemoteCall,
    EventCall,
    AuthInfo
} from "../types";

import {
    PermissionMetadata
} from "../metadata";

import {
    Service,
    Inject
} from "../decorators";

import {
    Configuration
} from "./config";

import {
    Forbidden,
    Unauthorized,
    BadRequest
} from "../errors";

import { Logger } from "../logger";

import { Utils } from "../utils";

import JWT = require("jsonwebtoken");

import MS = require("ms");

export const Security = "security";

export interface Security extends Service {
    restAuth(call: RestCall, permission: PermissionMetadata): Promise<Context>;
    remoteAuth(call: RemoteCall, permission: PermissionMetadata): Promise<Context>;
    eventAuth(call: EventCall, permission: PermissionMetadata): Promise<Context>;
    issueToken(req: IssueRequest): string;
}

export abstract class BaseSecurity implements Security {
    public readonly log: Logger;

    constructor() {
        this.log = Logger.get(Security, this);
    }

    protected abstract config: Configuration;

    public async restAuth(call: RestCall, permission: PermissionMetadata): Promise<Context> {
        let token = call.headers && (call.headers["Authorization"] || call.headers["authorization"])
            || call.queryStringParameters && (call.queryStringParameters["authorization"] || call.queryStringParameters["token"])
            || call.pathParameters && call.pathParameters["authorization"];
        if (!permission.roles.Public && !permission.roles.Debug && !token) throw new Unauthorized("Missing authorization token");
        if (permission.roles.Public) {
            if (token) this.log.debug("Ignore token on public permission");
            let ctx: Context = {
                requestId: call.requestId,
                token,
                renewed: false,
                permission,
                auth: {
                    tokenId: call.requestId,
                    subject: "user:public",
                    issuer: this.config.appId,
                    audience: this.config.appId,
                    remote: false,
                    userId: null,
                    role: "Public",
                    issued: new Date(),
                    expires: new Date(Date.now() + 60000)
                }
            };
            return ctx;
        } else if (permission.roles.Debug) {
            if (token) this.log.debug("Ignore token on debug permission");
            if (call.sourceIp !== "127.0.0.1" && call.sourceIp !== "::1")
                throw new Forbidden("Debug access only available on localhost");
            let ctx: Context;
            if (token) {
                ctx = await this.verify(call.requestId, token, permission, call.sourceIp);
                token = this.renew(ctx.auth);
                if (token) {
                    ctx.token = token;
                    ctx.renewed = true;
                }
            } else {
                ctx = {
                    requestId: call.requestId,
                    token,
                    renewed: false,
                    permission,
                    auth: {
                        tokenId: call.requestId,
                        subject: "user:debug",
                        issuer: this.config.appId,
                        audience: this.config.appId,
                        remote: false,
                        userId: null,
                        role: "Debug",
                        issued: new Date(),
                        expires: new Date(Date.now() + 60000)
                    }
                };
            }
            return ctx;
        }
        let ctx = await this.verify(call.requestId, token, permission, call.sourceIp);
        token = this.renew(ctx.auth);
        if (token) {
            ctx.token = token;
            ctx.renewed = true;
        }
        return ctx;
    }

    public async remoteAuth(call: RemoteCall, permission: PermissionMetadata): Promise<Context> {
        if (!permission.roles.Remote && !permission.roles.Internal)
            throw new Forbidden(`Remote calls not allowed for method [${permission.method}]`);
        let ctx = await this.verify(call.requestId, call.token, permission, null);
        if (ctx.auth.remote && !permission.roles.Remote)
            throw new Unauthorized(`Internal call allowed only for method [${permission.method}]`);
        return ctx;
    }

    public async eventAuth(call: EventCall, permission: PermissionMetadata): Promise<Context> {
        if (!permission.roles.Internal)
            throw new Forbidden(`Internal events not allowed for method [${permission.method}]`);
        let ctx: Context = {
            requestId: call.requestId,
            token: null,
            renewed: false,
            permission,
            auth: {
                tokenId: call.requestId,
                subject: "event",
                issuer: this.config.appId,
                audience: this.config.appId,
                remote: false,
                userId: null, // TODO: Callee
                role: "Internal",
                issued: new Date(),
                expires: new Date(Date.now() + 60000)
            }
        };
        return ctx;
    }

    public issueToken(req: IssueRequest): string {
        req.tokenId = req.tokenId || Utils.uuid();
        req.audience = req.audience || this.config.appId;
        let secret = this.secret(req.subject, this.config.appId, req.audience);
        let timeout = this.timeout(req.subject, this.config.appId, req.audience);
        let serial = (req.serial instanceof Date) ? req.serial.getTime() : +req.serial || Date.now();
        let token = JWT.sign(
            {
                oid: req.userId,
                role: req.role,
                scope: req.scope,
                ist: Math.floor(serial / 1000),
                email: req.email,
                ipaddr: req.ipAddress
            } as any,
            secret,
            {
                jwtid: req.tokenId,
                issuer: this.config.appId,
                audience: req.audience,
                subject: req.subject,
                expiresIn: timeout
            }
        );
        return token;
    }

    protected async verify(requestId: string, token: string, permission: PermissionMetadata, ipAddress: string): Promise<Context> {
        let decoded: WebToken, secret: string;
        try {
            if (token && token.startsWith("Bearer")) token = token.substring(6).trim();
            decoded = JWT.decode(token) as WebToken;
            secret = decoded && this.secret(decoded.sub, decoded.iss, decoded.aud) || "NULL";
            decoded = JWT.verify(token, secret) as WebToken;
        } catch (e) {
            this.log.error("Token [%s]: %j", secret, decoded);
            this.log.error(e);
            if (e.message === "jwt expired") throw new Unauthorized(`Token: expired [${Date.now()}] > [${decoded.exp * 1000}]`);
            throw new BadRequest("Token: " + e.message, e);
        }

        if (decoded.role !== "Application" && ipAddress && decoded.ipaddr !== ipAddress)
            throw new Unauthorized(`Invalid request IP address`);

        if (decoded.role !== "Application" && permission.roles[decoded.role] !== true)
            throw new Unauthorized(`Role [${decoded.role}] not authorized to access method [${permission.method}]`);

        let ctx: Context = {
            requestId,
            token,
            renewed: false,
            permission,
            auth: {
                tokenId: decoded.jti,
                subject: decoded.sub,
                issuer: decoded.iss,
                audience: decoded.aud,
                remote: decoded.iss !== decoded.aud,
                userId: decoded.oid,
                role: decoded.role,
                scope: decoded.scope,
                email: decoded.email,
                name: decoded.name,
                ipAddress: decoded.ipaddr,
                serial: new Date(decoded.ist * 1000),
                issued: new Date(decoded.iat * 1000),
                expires: new Date(decoded.exp * 1000)
            }
        };
        return ctx;
    }

    protected renew(auth: AuthInfo): string {
        // Only for tokens issued by application
        if (auth.issuer !== this.config.appId || !this.config.restLifetime) return null;
        // Limited to REST users
        if (auth.subject !== "user:internal" && auth.subject !== "user:external") return null;
        // Do not renew to offen
        let untilExp = auth.expires.getTime() - Date.now();
        if (untilExp > MS(this.config.restTimeout) / 2) return null;
        // Limit to max renew period
        if (auth.expires.getTime() - auth.serial.getTime() > MS(this.config.restLifetime)) return null;

        let token = this.issueToken(auth);
        return token;
    }

    protected secret(subject: string, issuer: string, audience: string): string {
        let secret: string;
        if (subject.startsWith("user:")) secret = this.config.restSecret;
        else if (subject === "internal" && audience === this.config.appId && issuer === audience) secret = this.config.internalSecret;
        else if (subject === "remote" && audience === this.config.appId && issuer === audience) secret = this.config.internalSecret;
        else if (subject === "remote" && audience === this.config.appId && issuer !== audience) secret = this.config.remoteSecret(issuer);
        else if (subject === "remote" && issuer === this.config.appId && issuer !== audience) secret = this.config.remoteSecret(audience);
        if (!secret) throw new Unauthorized(`Can not resolve token secret for subject: [${subject}], issuer: [${issuer}], audience: [${audience}]`);
        return secret;
    }

    protected timeout(subject: string, issuer: string, audience: string): string {
        let timeout: string;
        if (subject.startsWith("user:")) timeout = this.config.restTimeout;
        else if (subject === "internal" && audience === this.config.appId) timeout = this.config.internalTimeout;
        else if (subject === "remote" && audience === this.config.appId && issuer === audience) timeout = this.config.internalTimeout;
        else if (subject === "remote" && audience === this.config.appId && issuer !== audience) timeout = this.config.remoteTimeout;
        else if (subject === "remote" && audience !== this.config.appId) timeout = this.config.remoteTimeout;
        if (!timeout) throw new Unauthorized(`Can not resolve token timeout for subject: [${subject}], issuer: [${issuer}], audience: [${audience}]`);
        return timeout;
    }
}

@Service(Security)
export class DefaultSecurity extends BaseSecurity {
    @Inject(Configuration)
    protected config: Configuration;
}



