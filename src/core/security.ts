import { Utils } from 'exer';
import { Activate, CoreService, Inject } from '../decorators/service';
import { BadRequest, Forbidden, Unauthorized } from '../errors';
import { Logger } from '../logger';
import { MethodMetadata } from '../metadata/method';
import { Configuration } from '../types/config';
import { Context, CoreContainer } from '../types/core';
import { EventRequest, PingRequest } from '../types/event';
import { HttpRequest } from '../types/http';
import { RemoteRequest } from '../types/proxy';
import { AuthInfo, IssueRequest, Security, WebToken } from '../types/security';

import JWT = require('jsonwebtoken');
import MS = require('ms');

@CoreService(Security)
export class CoreSecurity implements Security {
  @Logger()
  protected log: Logger;

  constructor() { }

  @Inject(alias => Configuration)
  protected config: Configuration;

  @Activate()
  public async activate() {
  }

  public async httpAuth(container: CoreContainer, method: MethodMetadata, req: HttpRequest): Promise<Context> {
    const token = req.headers && (req.headers['Authorization'] || req.headers['authorization'])
      || req.queryStringParameters && (req.queryStringParameters['authorization'] || req.queryStringParameters['token'])
      || req.pathParameters && req.pathParameters['authorization'];
    return this.userAuth(container, method, token, req.requestId, req.sourceIp);
  }

  public async graphAuth(container: CoreContainer, method: MethodMetadata, ctx: Context): Promise<Context> {
    const auth = this.authorize(method, ctx.auth);
    return new Context({
      container,
      requestId: ctx.requestId,
      sourceIp: ctx.sourceIp,
      method,
      auth
    });
  }

  private async userAuth(
    container: CoreContainer,
    method: MethodMetadata,
    token: string,
    requestId: string,
    sourceIp: string,
  ): Promise<Context> {
    const localhost = sourceIp === '127.0.0.1' || sourceIp === '::1';

    if (!method.roles.Public && !(method.roles.Local && localhost)) {
      if (!token) throw new Unauthorized('Missing authorization token');
      let auth = this.verify(token, method, sourceIp);
      auth = this.renew(auth);
      return new Context({ container, requestId, sourceIp, method, auth });
    }

    if (method.roles.Public && token) {
      this.log.debug('Ignore token on public permission');
    }

    const ctx = new Context({
      container,
      requestId,
      sourceIp,
      method,
      auth: {
        tokenId: requestId,
        subject: 'user:public',
        issuer: this.config.appId,
        audience: this.config.appId,
        remote: false,
        userId: null,
        role: 'Public',
        issued: new Date(),
        expires: new Date(Date.now() + 60000),
        token,
        renewed: false,
      }
    });

    if (method.roles.Local) {
      if (!localhost) throw new Forbidden('Debug role only valid for localhost');
      ctx.auth.subject = 'user:debug';
      ctx.auth.role = 'Debug';
      if (token) {
        // try {
        ctx.auth = await this.verify(token, method, sourceIp);
        ctx.auth = this.renew(ctx.auth);
        // } catch (err) {
        //   this.log.debug('Ignore invalid token on debug permission', err);
        // }
      }
    }

    return ctx;
  }

  public async apiAuth(container: CoreContainer, method: MethodMetadata, ctx: Context): Promise<Context> {
    let org: Context = null;
    if (ctx instanceof Context) {
      org = ctx;
    }
    // TODO: Make ctx mandatory
    return new Context({
      container,
      requestId: org && org.requestId || Utils.uuid(),
      sourceIp: org && org.sourceIp || null,
      method,
      auth: org.auth || null
    });
  }

  public async remoteAuth(container: CoreContainer, method: MethodMetadata, req: RemoteRequest): Promise<Context> {
    if (!method.roles.Remote && !method.roles.Internal) {
      throw new Forbidden(`Remote requests not allowed for method [${method.name}]`);
    }
    const auth = await this.verify(req.token, method, null);
    if (auth.remote && !method.roles.Remote) {
      throw new Unauthorized(`Internal request allowed only for method [${method.name}]`);
    }
    return new Context({ container, requestId: req.requestId, sourceIp: null, method, auth });
  }

  public async eventAuth(container: CoreContainer, method: MethodMetadata, req: EventRequest | PingRequest): Promise<Context> {
    if (!method.roles.Internal) {
      throw new Forbidden(`Internal events not allowed for method [${method.name}]`);
    }
    const ctx = new Context({
      container,
      requestId: req.requestId,
      sourceIp: null,
      method,
      auth: {
        tokenId: req.requestId,
        subject: 'event',
        issuer: this.config.appId,
        audience: this.config.appId,
        remote: false,
        userId: null, // TODO: Callee, any info on event origin
        role: 'Internal',
        issued: new Date(),
        expires: new Date(Date.now() + 60000),
        token: null,
        renewed: false,
      },
    });
    return ctx;
  }

  public issueToken(req: IssueRequest): string {
    req.tokenId = req.tokenId || Utils.uuid();
    req.audience = req.audience || this.config.appId;
    const secret = this.secret(req.subject, this.config.appId, req.audience);
    const timeout = this.timeout(req.subject, this.config.appId, req.audience);
    const serial = (req.serial instanceof Date) ? req.serial.getTime() : +req.serial || Date.now();
    const token = JWT.sign(
      {
        oid: req.userId,
        role: req.role,
        scope: req.scope,
        ist: Math.floor(serial / 1000),
        email: req.email,
        ipaddr: req.ipAddress,
        tenantId : req.tenantId || ""
      } as any,
      secret,
      {
        jwtid: req.tokenId,
        issuer: this.config.appId,
        audience: req.audience,
        subject: req.subject,
        expiresIn: timeout,
      },
    );
    return token;
  }

  protected verify(token: string, method: MethodMetadata, sourceIp?: string): AuthInfo {
    let jwt: WebToken;
    let secret: string;
    try {
      // tslint:disable-next-line:no-parameter-reassignment
      if (token && token.startsWith('Bearer')) token = token.substring(6).trim();
      jwt = JWT.decode(token) as WebToken;
      secret = jwt && this.secret(jwt.sub, jwt.iss, jwt.aud) || 'NULL';
      jwt = JWT.verify(token, secret) as WebToken;
    } catch (e) {
      this.log.error('Token [%s]: %j', secret, jwt);
      this.log.error(e);
      if (e.message === 'jwt expired') {
        throw new Unauthorized(`Token: expired [${new Date(jwt.exp * 1000).toISOString()}] < [${new Date().toISOString()}]`);
      } else {
        throw new BadRequest('Token: ' + e.message, e);
      }
    }
    const auth: AuthInfo = {
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
      serial: new Date((jwt.ist || jwt.iat) * 1000),
      issued: new Date(jwt.iat * 1000),
      expires: new Date(jwt.exp * 1000),
      token,
      renewed: false,
      tenantId : jwt.tenantId
    };
    if (method) this.authorize(method, auth, sourceIp);
    return auth;
  }

  protected authorize(method: MethodMetadata, auth: AuthInfo, sourceIp?: string): AuthInfo {
    if (auth.audience !== this.config.appId) {
      throw new Unauthorized(`Invalid audience: ${auth.audience}`);
    }
    if (auth.role !== 'Application' && this.config.httpStrictIpCheck === 'true' && sourceIp && auth.ipAddress !== sourceIp) {
      throw new Unauthorized(`Invalid request IP address: ${auth.ipAddress}`);
    }
    if (auth.role !== 'Application' && !method.roles[auth.role]) {
      throw new Unauthorized(`Role [${auth.role}] not authorized to access method [${method.name}]`);
    }
    const expiry = new Date(
      new Date(auth.issued).getTime()
      + MS(this.timeout(auth.subject, auth.issuer, auth.audience))
    );
    // Check age of application token
    if (expiry.getTime() < Date.now() || auth.expires.getTime() < Date.now()) {
      throw new Unauthorized(`Token: expired [${expiry.toISOString()}]`);
    }
    return auth;
  }

  protected renew(auth: AuthInfo): AuthInfo {
    auth.renewed = false;
    // Only for tokens issued by application
    if (auth.issuer !== this.config.appId || !this.config.httpLifetime) return auth;
    // Limited to REST users
    if (auth.subject !== 'user:internal' && auth.subject !== 'user:external') return auth;
    // Do not renew to offen
    const untilExp = auth.expires.getTime() - Date.now();
    if (untilExp > MS(this.config.httpTimeout) / 2) return auth;
    // Limit to max renew period
    if (auth.expires.getTime() - auth.serial.getTime() > MS(this.config.httpLifetime)) return auth;
    auth.token = this.issueToken(auth);
    auth.renewed = true;
    return auth;
  }

  protected secret(sub: string, iss: string, aud: string): string {
    let secret: string;
    this.log.debug("Tyx config", this.config);
    this.log.debug("Tyx config", JSON.stringify(this.config));
    if (sub && sub.startsWith('user:')) secret = this.config.httpSecret;
    else if (sub === 'internal' && aud === this.config.appId && iss === aud) secret = this.config.internalSecret;
    else if (sub === 'remote' && aud === this.config.appId && iss === aud) secret = this.config.internalSecret;
    else if (sub === 'remote' && aud === this.config.appId && iss !== aud) secret = this.config.remoteSecret(iss);
    else if (sub === 'remote' && iss === this.config.appId && iss !== aud) secret = this.config.remoteSecret(aud);
    if (!secret) {
      throw new Unauthorized(`Can not resolve token secret for subject: [${sub}], issuer: [${iss}], audience: [${aud}]`);
    }
    return secret;
  }

  protected timeout(sub: string, iss: string, aud: string): string {
    let timeout: string;
    if (sub && sub.startsWith('user:')) timeout = this.config.httpTimeout;
    else if (sub === 'internal' && aud === this.config.appId) timeout = this.config.internalTimeout;
    else if (sub === 'remote' && aud === this.config.appId && iss === aud) timeout = this.config.internalTimeout;
    else if (sub === 'remote' && aud === this.config.appId && iss !== aud) timeout = this.config.remoteTimeout;
    else if (sub === 'remote' && aud !== this.config.appId) timeout = this.config.remoteTimeout;
    if (!timeout) {
      throw new Unauthorized(`Can not resolve token timeout for subject: [${sub}], issuer: [${iss}], audience: [${aud}]`);
    }
    return timeout;
  }
}
