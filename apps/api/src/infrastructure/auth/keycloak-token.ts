import { UnauthorizedException, ForbiddenException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as KeycloakConnect from "keycloak-connect";

export interface AuthenticatedUser {
  sub: string;
  userId: string;
  email: string;
  emailVerified: boolean;
  organizationId: string;
  roles: string[];
  name?: string;
}

export function extractBearerToken(header: unknown): string {
  if (typeof header !== "string") {
    throw new UnauthorizedException("Authentication required");
  }
  const match = /^Bearer ([^\s]+)$/i.exec(header);
  if (!match) {
    throw new UnauthorizedException("Invalid authorization format");
  }
  return match[1];
}

/** Tenant selection is currently limited to the organization in the verified token. */
export function assertSelectedOrganization(selected: unknown, organizationId: string): void {
  if (selected !== undefined && (typeof selected !== "string" || selected !== organizationId)) {
    throw new ForbiddenException("Selected organization does not match the authenticated organization");
  }
}

/** A bypass requires an explicit development environment, never an unset one. */
export function isDevelopmentAuthBypass(config: ConfigService): boolean {
  return config.get<string>("NODE_ENV") === "development" &&
    config.get<string>("SKIP_AUTH") === "true";
}

/**
 * Share the real Keycloak verification path across REST and GraphQL. Claims are
 * read only from the grant that Keycloak verified, never from an unsigned decode.
 */
export async function verifyKeycloakAccessToken(
  token: string,
  keycloak: KeycloakConnect.Keycloak,
  config: ConfigService,
): Promise<AuthenticatedUser> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3 || parts.some((part) => !part)) {
      throw new Error("Malformed token");
    }
    const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    if (header.alg !== "RS256") throw new Error("Unsupported token algorithm");

    const manager = keycloak.grantManager;
    const grant = await manager.createGrant(JSON.stringify({ access_token: token }));
    const accessToken = grant.access_token;
    if (!accessToken) throw new Error("Missing access token");

    const payload = (accessToken as unknown as { content: Record<string, unknown> }).content;
    if (!payload || typeof payload !== "object") throw new Error("Invalid token payload");
    const now = Math.floor(Date.now() / 1000);
    const issuer = `${(config.get<string>("KEYCLOAK_URL") || "http://localhost:8080").replace(/\/$/, "")}/realms/${config.get<string>("KEYCLOAK_REALM") || "plainledger"}`;
    const audience = config.get<string>("KEYCLOAK_CLIENT_ID") || "plainledger-api";
    const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];

    if (typeof payload.exp !== "number" || !Number.isFinite(payload.exp) || payload.exp <= now ||
        (payload.nbf !== undefined && (typeof payload.nbf !== "number" || !Number.isFinite(payload.nbf) || payload.nbf > now)) ||
        payload.iss !== issuer || !audiences.includes(audience)) {
      throw new Error("Invalid token claims");
    }
    if (typeof payload.sub !== "string" || !payload.sub.trim()) throw new Error("Missing subject");

    const organizations = [payload.organization_id, payload.organization, payload.org_id]
      .filter((value) => value !== undefined && value !== null);
    if (!organizations.length || organizations.some((value) =>
      typeof value !== "string" || !value.trim() || value !== organizations[0])) {
      throw new Error("Missing or ambiguous organization");
    }

    const realmAccess = payload.realm_access as { roles?: unknown } | undefined;
    const roles = realmAccess?.roles ?? payload.roles ?? [];
    if (!Array.isArray(roles) || roles.some((role) => typeof role !== "string")) throw new Error("Invalid roles");

    // Introspection also rejects revoked tokens and terminated sessions.
    if (!await manager.validateAccessToken(accessToken)) throw new Error("Inactive token");

    return {
      sub: payload.sub,
      userId: payload.sub,
      email: typeof payload.email === "string" ? payload.email :
        typeof payload.preferred_username === "string" ? payload.preferred_username : "",
      emailVerified: payload.email_verified === true,
      organizationId: organizations[0] as string,
      roles,
      name: typeof payload.name === "string" ? payload.name :
        typeof payload.given_name === "string" ? payload.given_name : undefined,
    };
  } catch {
    throw new UnauthorizedException("Invalid or expired token");
  }
}
