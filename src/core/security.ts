import { Inject } from "../decorators/service";
import { BadRequest, Forbidden, Unauthorized } from "../errors";
import { Logger } from "../logger";
import { MethodMetadata } from "../metadata/method";
import { Configuration } from "../types/config";
import { Context, CoreContainer } from "../types/core";
import { EventRequest } from "../types/event";
import { HttpRequest } from "../types/http";
import { RemoteRequest } from "../types/proxy";
import { AuthInfo, IssueRequest, Security, WebToken } from "../types/security";
import { Utils } from "../utils";

import JWT = require("jsonwebtoken");
import MS = require("ms");

export class CoreSecurity implements Security {
    public readonly log: Logger;

    constructor() {
        this.log = Logger.get(Security, this);
    }

    @Inject(Configuration)
    protected config: Configuration;

    public async httpAuth(container: CoreContainer, req: HttpRequest, method: MethodMetadata): Promise<Context> {
        let token = req.headers && (req.headers["Authorization"] || req.headers["authorization"])
            || req.queryStringParameters && (req.queryStringParameters["authorization"] || req.queryStringParameters["token"])
            || req.pathParameters && req.pathParameters["authorization"];

        let localhost = req.sourceIp === "127.0.0.1" || req.sourceIp === "::1";

        if (!method.roles.Public && !(method.roles.Debug && localhost)) {
            if (!token) throw new Unauthorized("Missing authorization token");
            let auth = await this.verify(req.requestId, token, method, req.sourceIp);
            auth = this.renew(auth);
            return new Context({ container, requestId: req.requestId, method, auth });
        }

        if (method.roles.Public && token)
            this.log.debug("Ignore token on public permission");

        let ctx = new Context({
            container,
            requestId: req.requestId,
            method,
            auth: {
                tokenId: req.requestId,
                subject: "user:public",
                issuer: this.config.appId,
                audience: this.config.appId,
                remote: false,
                userId: null,
                role: "Public",
                issued: new Date(),
                expires: new Date(Date.now() + 60000),
                token,
                renewed: false
            }
        });

        if (method.roles.Debug) {
            if (!localhost) throw new Forbidden("Debug role only valid for localhost");
            ctx.auth.subject = "user:debug";
            ctx.auth.role = "Debug";
            if (token) try {
                ctx.auth = await this.verify(req.requestId, token, method, req.sourceIp);
                ctx.auth = this.renew(ctx.auth);
            } catch (err) {
                this.log.debug("Ignore invalid token on debug permission", err);
            }
        }

        return ctx;
    }

    public async remoteAuth(container: CoreContainer, req: RemoteRequest, method: MethodMetadata): Promise<Context> {
        if (!method.roles.Remote && !method.roles.Internal)
            throw new Forbidden(`Remote requests not allowed for method [${method.methodId}]`);
        let auth = await this.verify(req.requestId, req.token, method, null);
        if (auth.remote && !method.roles.Remote)
            throw new Unauthorized(`Internal request allowed only for method [${method.methodId}]`);
        return new Context({ container, requestId: req.requestId, method, auth });
    }

    public async eventAuth(container: CoreContainer, req: EventRequest, method: MethodMetadata): Promise<Context> {
        if (!method.roles.Internal)
            throw new Forbidden(`Internal events not allowed for method [${method.methodId}]`);
        let ctx = new Context({
            container,
            requestId: req.requestId,
            method,
            auth: {
                tokenId: req.requestId,
                subject: "event",
                issuer: this.config.appId,
                audience: this.config.appId,
                remote: false,
                userId: null, // TODO: Callee, any info on event origin
                role: "Internal",
                issued: new Date(),
                expires: new Date(Date.now() + 60000),
                token: null,
                renewed: false,
            }
        });
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

    protected async verify(requestId: string, token: string, permission: MethodMetadata, ipAddress: string): Promise<AuthInfo> {
        let jwt: WebToken, secret: string;
        try {
            if (token && token.startsWith("Bearer")) token = token.substring(6).trim();
            jwt = JWT.decode(token) as WebToken;
            secret = jwt && this.secret(jwt.sub, jwt.iss, jwt.aud) || "NULL";
            jwt = JWT.verify(token, secret) as WebToken;
        } catch (e) {
            this.log.error("Token [%s]: %j", secret, jwt);
            this.log.error(e);
            if (e.message === "jwt expired") throw new Unauthorized(`Token: expired [${new Date(jwt.exp * 1000).toISOString()}] < [${new Date().toISOString()}]`);
            throw new BadRequest("Token: " + e.message, e);
        }

        if (jwt.aud !== this.config.appId)
            throw new Unauthorized(`Invalid audience: ${jwt.aud}`);

        if (jwt.role !== "Application" && ipAddress && jwt.ipaddr !== ipAddress)
            throw new Unauthorized(`Invalid request IP address: ${jwt.ipaddr}`);

        if (jwt.role !== "Application" && permission.roles[jwt.role] !== true)
            throw new Unauthorized(`Role [${jwt.role}] not authorized to access method [${permission.methodId}]`);

        let expiry = new Date(jwt.iss).getTime() + MS(this.timeout(jwt.sub, jwt.iss, jwt.aud));
        // Check age of application token
        if (expiry < Date.now())
            throw new Unauthorized(`Token: expired [${new Date(expiry).toISOString()}]`);

        return {
            tokenId: jwt.jti,
            subject: jwt.sub,
            issuer: jwt.iss,
            audience: jwt.aud,
            remote: jwt.iss !== jwt.aud,
            userId: jwt.oid,
            role: jwt.role,
            scope: jwt.scope,
            email: jwt.email,
            name: jwt.name,
            ipAddress: jwt.ipaddr,
            serial: new Date(jwt.ist * 1000),
            issued: new Date(jwt.iat * 1000),
            expires: new Date(jwt.exp * 1000),
            token,
            renewed: false
        };
    }

    protected renew(auth: AuthInfo): AuthInfo {
        auth.renewed = false;
        // Only for tokens issued by application
        if (auth.issuer !== this.config.appId || !this.config.httpLifetime) return auth;
        // Limited to REST users
        if (auth.subject !== "user:internal" && auth.subject !== "user:external") return auth;
        // Do not renew to offen
        let untilExp = auth.expires.getTime() - Date.now();
        if (untilExp > MS(this.config.httpTimeout) / 2) return auth;
        // Limit to max renew period
        if (auth.expires.getTime() - auth.serial.getTime() > MS(this.config.httpLifetime)) return auth;
        auth.token = this.issueToken(auth);
        auth.renewed = true;
        return auth;
    }

    protected secret(subject: string, issuer: string, audience: string): string {
        let secret: string;
        if (subject.startsWith("user:")) secret = this.config.httpSecret;
        else if (subject === "internal" && audience === this.config.appId && issuer === audience) secret = this.config.internalSecret;
        else if (subject === "remote" && audience === this.config.appId && issuer === audience) secret = this.config.internalSecret;
        else if (subject === "remote" && audience === this.config.appId && issuer !== audience) secret = this.config.remoteSecret(issuer);
        else if (subject === "remote" && issuer === this.config.appId && issuer !== audience) secret = this.config.remoteSecret(audience);
        if (!secret) throw new Unauthorized(`Can not resolve token secret for subject: [${subject}], issuer: [${issuer}], audience: [${audience}]`);
        return secret;
    }

    protected timeout(subject: string, issuer: string, audience: string): string {
        let timeout: string;
        if (subject.startsWith("user:")) timeout = this.config.httpTimeout;
        else if (subject === "internal" && audience === this.config.appId) timeout = this.config.internalTimeout;
        else if (subject === "remote" && audience === this.config.appId && issuer === audience) timeout = this.config.internalTimeout;
        else if (subject === "remote" && audience === this.config.appId && issuer !== audience) timeout = this.config.remoteTimeout;
        else if (subject === "remote" && audience !== this.config.appId) timeout = this.config.remoteTimeout;
        if (!timeout) throw new Unauthorized(`Can not resolve token timeout for subject: [${subject}], issuer: [${issuer}], audience: [${audience}]`);
        return timeout;
    }
}
