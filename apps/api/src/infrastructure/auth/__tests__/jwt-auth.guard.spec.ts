import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtAuthGuard } from "../jwt-auth.guard";
import { createTestIdentityProvider } from "./test-identity-provider";

describe("REST JWT authentication", () => {
  const identity = createTestIdentityProvider();
  let guard: JwtAuthGuard;
  const contextFor = (authorization?: unknown) => {
    const request = { headers: { authorization }, user: undefined as unknown, method: "GET" };
    return { request, context: { getHandler: () => () => undefined, getClass: () => class {}, switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext };
  };
  beforeEach(() => {
    identity.config.set("NODE_ENV", "test"); identity.config.set("SKIP_AUTH", "false");
    guard = new JwtAuthGuard(new Reflector(), identity.config, identity.keycloak);
  });
  afterEach(() => guard.onModuleDestroy());

  it("accepts and maps a cryptographically verified token", async () => {
    const { request, context } = contextFor(`Bearer ${identity.issueToken()}`);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toMatchObject({ sub: "user-123", organizationId: "org-123" });
  });
  it("rejects a forged signature before trusting tenant or admin claims", async () => {
    const token = identity.issueToken({ organization: "victim", realm_access: { roles: ["super-admin"] } }).split(".");
    token[2] = `${token[2][0] === "a" ? "b" : "a"}${token[2].slice(1)}`;
    await expect(guard.canActivate(contextFor(`Bearer ${token.join(".")}`).context)).rejects.toThrow(UnauthorizedException);
  });
  it.each(["production", "test", "staging", undefined])("rejects SKIP_AUTH outside explicit development: %p", async (environment) => {
    identity.config.set("NODE_ENV", environment); identity.config.set("SKIP_AUTH", "true");
    await expect(guard.canActivate(contextFor().context)).rejects.toThrow(UnauthorizedException);
  });
});
