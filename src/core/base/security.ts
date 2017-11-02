import "../env";

import {
    Context,
    IssueRequest,
    AuthInfo,
    RestCall,
    WebToken,
    RemoteCall,
    EventCall
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
        let token = call.headers && (call.headers["Authorization"] || call.headers["authorization"]);
        if (!permission.roles.Public && !token) throw new Unauthorized("Missing authorization token");
        if (permission.roles.Public) {
            if (token) this.log.debug("Ignore token on public permission");
            let ctx: Context = {
                requestId: call.requestId,
                token,
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
        }
        return await this.verify(call.requestId, token, permission);
    }

    public async remoteAuth(call: RemoteCall, permission: PermissionMetadata): Promise<Context> {
        if (!permission.roles.Remote && !permission.roles.Internal)
            throw new Forbidden(`Remote calls not allowed for method [${permission.method}]`);
        let ctx = await this.verify(call.requestId, call.token, permission);
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
        let token = JWT.sign(
            {
                oid: req.userId,
                role: req.role,
                // email: auth.email,
                // name: auth.name,
                // ipaddr: req.ipAddress
            } as any,
            secret,
            {
                jwtid: req.tokenId,
                // TODO: Use application URL
                issuer: this.config.appId,
                audience: req.audience,
                subject: req.subject,
                // TODO: Expires based on jwt input
                expiresIn: timeout
            }
        );
        return token;
    }

    protected async verify(requestId: string, token: string, permission: PermissionMetadata): Promise<Context> {
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

        if (decoded.role !== "Application" && permission.roles[decoded.role] !== true)
            throw new Unauthorized(`Role [${decoded.role}] not authorized to access method [${permission.method}]`);
        let ctx: Context = {
            requestId,
            token,
            permission,
            auth: {
                tokenId: decoded.jti,
                subject: decoded.sub,
                issuer: decoded.iss,
                audience: decoded.aud,
                remote: decoded.iss !== decoded.aud,
                userId: decoded.oid,
                role: decoded.role,
                email: decoded.email,
                name: decoded.name,
                ipAddress: decoded.ipaddr,
                issued: new Date(decoded.iat * 1000),
                expires: new Date(decoded.exp * 1000)
            }
        };
        return ctx;
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

export abstract class DelegateSecurity extends BaseSecurity {

    public async delegateToken(jwt: WebToken): Promise<AuthInfo> {
        let auth = this.toAuth(jwt);

        auth = await this.validate(auth);
        auth.subject = auth.subject || "user:public";
        auth.role = auth.role || null;

        let token = await this.issueToken(auth);
        let dt = JWT.decode(token) as WebToken;
        this.log.debug("Delegate token: %j", dt);

        let session = this.toAuth(dt);
        session.email = auth.email;
        session.name = auth.name;
        session = await this.persist(session);

        return session;
    }

    private toAuth(jwt: WebToken) {
        let auth: AuthInfo = {
            tokenId: jwt.jti,

            issuer: jwt.iss,
            audience: jwt.aud,
            subject: jwt.sub as any,
            remote: jwt.iss !== jwt.aud,

            userId: jwt.oid,
            role: jwt.role,
            email: jwt.email,
            name: jwt.name,
            ipAddress: jwt.ipaddr,

            issued: jwt.iat && new Date(jwt.iat * 1000),
            expires: jwt.exp && new Date(jwt.exp * 1000)

            // accessToken: jwt.access_token,
            // idToken: jwt.id_token,
            // refreshToken: jwt.refresh_token
        };
        return auth;
    }

    protected abstract async validate(auth: AuthInfo): Promise<AuthInfo>;
    protected abstract async persist(auth: AuthInfo): Promise<AuthInfo>;
}

@Service(Security)
export class DefaultSecurity extends BaseSecurity {
    @Inject(Configuration)
    protected config: Configuration;
}



