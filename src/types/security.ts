import { IMethodMetadata } from '../metadata/method';
import { Context, CoreContainer } from './core';
import { EventRequest, PingRequest } from './event';
import { HttpRequest } from './http';
import { RemoteRequest } from './proxy';

export interface Roles {
  Public?: boolean;
  Internal?: boolean;
  External?: boolean;
  Remote?: boolean;
  Local?: boolean;
  Application?: never;
  [role: string]: boolean;
}

export interface IssueRequest {
  tokenId?: string;
  audience?: string;
  subject: 'event' | 'remote' | 'user:internal' | 'user:external' | string;
  userId: string;
  role: string;
  scope?: string;
  serial?: number | Date;
  email?: string;
  ipAddress?: string;
  tenantId? : string;
}

export interface AuthInfo {
  tokenId?: string;

  issuer?: string;
  audience?: string;
  subject: 'event' | 'remote' | 'user:internal' | 'user:external' | 'user:public' | 'user:debug' | string;
  remote?: boolean;

  userId: string;
  role: string;
  scope?: string;

  email?: string;
  name?: string;
  ipAddress?: string;

  serial?: Date;
  issued?: Date;
  expires?: Date;

  token?: string;
  renewed?: boolean;
}

/**
 * Bases on JWT Token Claims at:
 * https://docs.microsoft.com/en-us/azure/active-directory/develop/active-directory-protocols-oauth-code
 */
export interface WebToken {
  // Tooken ID
  jti: string;

  // First issue
  ist: number;

  // Identifies the token issuer
  iss: string;
  // Audience of the token. When the token is issued to a client application, the audience is the client_id of the client.
  aud: string;
  // Token subject identifier. This is a persistent and immutable identifier for the user
  // that the token describes. Use this value in caching logic.
  sub: string;

  // Issued at time. The time when the JWT was issued.
  iat: number;
  // Not before time. The time when the token becomes effective.
  nbf: number;
  // Expiration time. The time when the token expires.
  exp: number;

  // Object identifier (ID) of the user object in Azure AD.
  oid: string;
  email?: string;
  name?: string;
  ipaddr?: string;

  // Tenant identifier (ID) of the Azure AD tenant that issued the token.
  tid?: string;
  // Version. The version of the JWT token, typically 1.0.
  ver?: string;
  // A unique identifier for that can be displayed to the user. This is usually a user principal name (UPN).
  unique_name?: string;

  // Session param
  role?: string;
  scope?: string;

  // Unknown params
  idp?: string;
  amr?: string[];
  platf?: string;
  uti?: string;
}

// tslint:disable-next-line:variable-name
export const Security = 'Security';

export interface Security {
  apiAuth(container: CoreContainer, method: IMethodMetadata, ctx: Context): Promise<Context>;
  graphAuth(container: CoreContainer, method: IMethodMetadata, ctx: Context): Promise<Context>;

  httpAuth(container: CoreContainer, method: IMethodMetadata, req: HttpRequest): Promise<Context>;
  remoteAuth(container: CoreContainer, method: IMethodMetadata, req: RemoteRequest): Promise<Context>;
  eventAuth(container: CoreContainer, method: IMethodMetadata, req: EventRequest | PingRequest): Promise<Context>;
  issueToken(req: IssueRequest): string;
}
