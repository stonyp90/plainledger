import { UnauthorizedException } from "@nestjs/common";
import { extractBearerToken, verifyKeycloakAccessToken } from "../keycloak-token";
import { createTestIdentityProvider } from "./test-identity-provider";

describe("verified Keycloak access tokens", () => {
  const identity = createTestIdentityProvider();
  beforeEach(() => identity.onlineValidation.mockImplementation(async (token) => token));

  it("verifies an RSA signature and maps only validated claims", async () => {
    const result = await verifyKeycloakAccessToken(identity.issueToken(), identity.keycloak, identity.config);
    expect(result).toMatchObject({ sub: "user-123", userId: "user-123", organizationId: "org-123", emailVerified: true, roles: ["viewer"] });
    expect(identity.onlineValidation).toHaveBeenCalled();
  });

  it("rejects a changed payload signed for another tenant", async () => {
    const parts = identity.issueToken().split(".");
    parts[1] = Buffer.from(JSON.stringify({ sub: "attacker", organization: "victim", roles: ["super-admin"] })).toString("base64url");
    await expect(verifyKeycloakAccessToken(parts.join("."), identity.keycloak, identity.config)).rejects.toThrow(UnauthorizedException);
  });

  it.each([
    ["expired", { exp: Math.floor(Date.now() / 1000) - 1 }],
    ["missing expiration", { exp: undefined }],
    ["non-numeric expiration", { exp: "tomorrow" }],
    ["not active yet", { nbf: Math.floor(Date.now() / 1000) + 3600 }],
    ["wrong issuer", { iss: "https://other-issuer.example/realms/plainledger" }],
    ["wrong audience", { aud: "other-api" }],
    ["missing subject", { sub: undefined }],
    ["empty subject", { sub: "" }],
    ["missing organization", { organization: undefined }],
    ["object organization", { organization: { id: "victim" } }],
    ["conflicting organizations", { organization_id: "another-org" }],
    ["invalid roles", { realm_access: { roles: "super-admin" } }],
  ])("rejects %s claims", async (_description, claims) => {
    await expect(verifyKeycloakAccessToken(identity.issueToken(claims), identity.keycloak, identity.config)).rejects.toThrow(UnauthorizedException);
  });

  it("accepts the API within a valid audience list", async () => {
    await expect(verifyKeycloakAccessToken(identity.issueToken({ aud: ["account", "plainledger-api"] }), identity.keycloak, identity.config)).resolves.toMatchObject({ sub: "user-123" });
  });

  it.each(["none", "HS256"])("rejects the %s algorithm", async (alg) => {
    await expect(verifyKeycloakAccessToken(identity.issueToken({}, { alg }), identity.keycloak, identity.config)).rejects.toThrow(UnauthorizedException);
  });

  it("rejects a revoked session", async () => {
    identity.onlineValidation.mockResolvedValue(false);
    await expect(verifyKeycloakAccessToken(identity.issueToken(), identity.keycloak, identity.config)).rejects.toThrow(UnauthorizedException);
  });

  it("fails closed when Keycloak cannot validate a session", async () => {
    identity.onlineValidation.mockRejectedValue(new Error("Identity provider unavailable"));
    await expect(verifyKeycloakAccessToken(identity.issueToken(), identity.keycloak, identity.config)).rejects.toThrow(UnauthorizedException);
  });

  it.each([undefined, ["Bearer token"], "Basic token", "Bearer token extra", "Bearer "])("rejects malformed headers: %p", (header) => {
    expect(() => extractBearerToken(header)).toThrow(UnauthorizedException);
  });
});
