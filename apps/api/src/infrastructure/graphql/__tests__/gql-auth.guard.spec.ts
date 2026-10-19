import { ExecutionContext, UnauthorizedException, HttpException, SetMetadata } from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";
import { Reflector } from "@nestjs/core";
import { GqlAuthGuard } from "../guards/gql-auth.guard";
import { createTestIdentityProvider } from "../../auth/__tests__/test-identity-provider";

describe("GqlAuthGuard", () => {
  const identity = createTestIdentityProvider();
  let guard: GqlAuthGuard;
  const handler = () => undefined;
  class Resolver {}
  const makeContext = (authorization?: unknown) => {
    const request = { headers: { authorization }, user: undefined as unknown };
    const ctx = {
      getContext: () => ({ req: request }),
      getInfo: () => ({ fieldName: "accounts", parentType: { name: "Query" } }),
    };
    jest.spyOn(GqlExecutionContext, "create").mockReturnValue(ctx as unknown as GqlExecutionContext);
    return { request, context: {
      getHandler: () => handler, getClass: () => Resolver,
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext };
  };

  beforeEach(() => {
    identity.config.set("NODE_ENV", "test");
    identity.config.set("SKIP_AUTH", "false");
    identity.onlineValidation.mockImplementation(async (token) => token);
    guard = new GqlAuthGuard(new Reflector(), identity.config, identity.keycloak);
  });
  afterEach(() => { guard.onModuleDestroy(); jest.spyOn(GqlExecutionContext, "create").mockRestore(); Reflect.deleteMetadata("isPublic", handler); Reflect.deleteMetadata("isPublic", Resolver); });

  it.each([undefined, "wrong-format", "Bearer invalid-token"])("rejects absent or malformed tokens: %p", async (authorization) => {
    await expect(guard.canActivate(makeContext(authorization).context)).rejects.toThrow(UnauthorizedException);
  });

  it("attaches a verified identity and tenant to the request", async () => {
    const { request, context } = makeContext(`Bearer ${identity.issueToken()}`);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toMatchObject({ sub: "user-123", userId: "user-123", organizationId: "org-123", roles: ["viewer"] });
  });

  it("rejects expired tokens using the real grant manager", async () => {
    await expect(guard.canActivate(makeContext(`Bearer ${identity.issueToken({ exp: 1 })}`).context)).rejects.toThrow(UnauthorizedException);
  });

  it("maps supported alternate organization claims after verification", async () => {
    const { request, context } = makeContext(`Bearer ${identity.issueToken({ organization: undefined, org_id: "alternative-org" })}`);
    await guard.canActivate(context);
    expect(request.user).toMatchObject({ organizationId: "alternative-org" });
  });

  it.each([handler, Resolver])("honors explicit public metadata", async (target) => {
    SetMetadata("isPublic", true)(target);
    await expect(guard.canActivate(makeContext().context)).resolves.toBe(true);
  });

  it("allows an explicitly configured development bypass", async () => {
    identity.config.set("NODE_ENV", "development"); identity.config.set("SKIP_AUTH", "true");
    await expect(guard.canActivate(makeContext().context)).resolves.toBe(true);
  });

  it.each(["production", "test", "staging", undefined])("never bypasses authentication in %p", async (environment) => {
    identity.config.set("NODE_ENV", environment); identity.config.set("SKIP_AUTH", "true");
    await expect(guard.canActivate(makeContext().context)).rejects.toThrow(UnauthorizedException);
  });

  it("returns 429 at the rate limit without reporting an invalid login", async () => {
    const { context } = makeContext(`Bearer ${identity.issueToken()}`);
    for (let i = 0; i < 100; i++) await guard.canActivate(context);
    await expect(guard.canActivate(context)).rejects.toMatchObject({ status: 429 });
  });
});
