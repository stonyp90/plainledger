import { generateKeyPairSync, createSign } from "crypto";
import { ConfigService } from "@nestjs/config";
import * as KeycloakConnect from "keycloak-connect";

const Keycloak = require("keycloak-connect") as new (
  stores: Record<string, never>, config: Record<string, unknown>,
) => KeycloakConnect.Keycloak;

/** Test-only signer. Signature verification uses the real Keycloak grant manager. */
export function createTestIdentityProvider() {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const realmKey = publicKey.export({ type: "spki", format: "pem" }).toString()
    .replace(/-----[^-]+-----/g, "").replace(/\s/g, "");
  const keycloak = new Keycloak({}, {
    realm: "plainledger", resource: "plainledger-api", "auth-server-url": "http://localhost:8080",
    "realm-public-key": realmKey, "bearer-only": true, "verify-token-audience": true,
    credentials: { secret: "test-only-not-a-production-secret" },
  });
  const onlineValidation = jest.spyOn(keycloak.grantManager, "validateAccessToken")
    .mockImplementation(async (token) => token);
  const config = new ConfigService({ NODE_ENV: "test", KEYCLOAK_URL: "http://localhost:8080", KEYCLOAK_REALM: "plainledger", KEYCLOAK_CLIENT_ID: "plainledger-api" });
  const issueToken = (claims: Record<string, unknown> = {}, header: Record<string, unknown> = {}) => {
    const head = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT", ...header })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({
      sub: "user-123", email: "member@example.test", email_verified: true,
      organization: "org-123", realm_access: { roles: ["viewer"] },
      iss: "http://localhost:8080/realms/plainledger", aud: "plainledger-api", typ: "Bearer",
      iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 300,
      ...claims,
    })).toString("base64url");
    const signed = `${head}.${payload}`;
    const signature = createSign("RSA-SHA256").update(signed).sign(privateKey, "base64url");
    return `${signed}.${signature}`;
  };
  return { keycloak, config, issueToken, onlineValidation };
}
