/**
 * GraphQL Auth Guard Tests
 *
 * Tests for authentication, rate limiting, and security features.
 */
import { Test, TestingModule } from "@nestjs/testing";
import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";
import { Reflector } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { GqlAuthGuard } from "../guards/gql-auth.guard";

// Mock GqlExecutionContext
jest.mock("@nestjs/graphql", () => ({
  ...jest.requireActual("@nestjs/graphql"),
  GqlExecutionContext: {
    create: jest.fn(),
  },
}));

describe("GqlAuthGuard", () => {
  let guard: GqlAuthGuard;
  let reflector: Reflector;
  let configService: ConfigService;

  const createMockContext = (
    headers: Record<string, string> = {},
    user?: Record<string, unknown>,
  ): ExecutionContext => {
    const mockRequest = {
      headers,
      user,
    };

    const mockGqlContext = {
      getContext: () => ({ req: mockRequest }),
      getInfo: () => ({
        fieldName: "testQuery",
        parentType: { name: "Query" },
      }),
    };

    (GqlExecutionContext.create as jest.Mock).mockReturnValue(mockGqlContext);

    return {
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;
  };

  // Create a valid JWT for testing
  const createMockToken = (payload: Record<string, unknown>): string => {
    const header = Buffer.from(
      JSON.stringify({ alg: "HS256", typ: "JWT" }),
    ).toString("base64");
    const body = Buffer.from(
      JSON.stringify({
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        ...payload,
      }),
    ).toString("base64");
    const signature = "mock-signature";
    return `${header}.${body}.${signature}`;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GqlAuthGuard,
        {
          provide: Reflector,
          useValue: {
            get: jest.fn().mockReturnValue(false),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === "NODE_ENV") return "test";
              if (key === "SKIP_AUTH") return "false";
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    guard = module.get<GqlAuthGuard>(GqlAuthGuard);
    reflector = module.get<Reflector>(Reflector);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe("canActivate", () => {
    it("should allow access to public endpoints", async () => {
      jest.spyOn(reflector, "get").mockReturnValue(true);

      const context = createMockContext();
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it("should reject requests without authorization header", async () => {
      const context = createMockContext({});

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should reject requests with invalid authorization format", async () => {
      const context = createMockContext({
        authorization: "InvalidFormat token123",
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should reject requests with invalid JWT format", async () => {
      const context = createMockContext({
        authorization: "Bearer invalid-token",
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should allow requests with valid JWT", async () => {
      const token = createMockToken({
        sub: "user-123",
        email: "test@example.com",
        organization_id: "org-456",
        realm_access: { roles: ["user"] },
      });

      const context = createMockContext({
        authorization: `Bearer ${token}`,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it("should reject expired tokens", async () => {
      const expiredPayload = {
        sub: "user-123",
        exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      };
      const header = Buffer.from(JSON.stringify({ alg: "HS256" })).toString(
        "base64",
      );
      const body = Buffer.from(JSON.stringify(expiredPayload)).toString(
        "base64",
      );
      const token = `${header}.${body}.signature`;

      const context = createMockContext({
        authorization: `Bearer ${token}`,
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should extract organization ID from token", async () => {
      const token = createMockToken({
        sub: "user-123",
        organization_id: "org-specific-123",
      });

      const mockRequest = { headers: {}, user: undefined as unknown };
      const mockGqlContext = {
        getContext: () => ({ req: mockRequest }),
        getInfo: () => ({
          fieldName: "testQuery",
          parentType: { name: "Query" },
        }),
      };
      (GqlExecutionContext.create as jest.Mock).mockReturnValue(mockGqlContext);

      const context = {
        getHandler: () => ({}),
        getClass: () => ({}),
      } as ExecutionContext;

      mockRequest.headers = { authorization: `Bearer ${token}` };

      await guard.canActivate(context);

      expect(mockRequest.user).toBeDefined();
      expect((mockRequest.user as Record<string, string>).organizationId).toBe(
        "org-specific-123",
      );
    });

    it("should extract roles from Keycloak token format", async () => {
      const token = createMockToken({
        sub: "user-123",
        realm_access: {
          roles: ["admin", "user", "reports-viewer"],
        },
      });

      const mockRequest = { headers: {}, user: undefined as unknown };
      const mockGqlContext = {
        getContext: () => ({ req: mockRequest }),
        getInfo: () => ({
          fieldName: "testQuery",
          parentType: { name: "Query" },
        }),
      };
      (GqlExecutionContext.create as jest.Mock).mockReturnValue(mockGqlContext);

      const context = {
        getHandler: () => ({}),
        getClass: () => ({}),
      } as ExecutionContext;

      mockRequest.headers = { authorization: `Bearer ${token}` };

      await guard.canActivate(context);

      expect((mockRequest.user as Record<string, string[]>).roles).toContain(
        "admin",
      );
      expect((mockRequest.user as Record<string, string[]>).roles).toContain(
        "user",
      );
    });
  });

  describe("development mode", () => {
    it("should allow access when SKIP_AUTH is true in development", async () => {
      jest.spyOn(configService, "get").mockImplementation((key: string) => {
        if (key === "NODE_ENV") return "development";
        if (key === "SKIP_AUTH") return "true";
        return undefined;
      });

      const context = createMockContext({});
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it("should NOT skip auth in production even if SKIP_AUTH is set", async () => {
      jest.spyOn(configService, "get").mockImplementation((key: string) => {
        if (key === "NODE_ENV") return "production";
        if (key === "SKIP_AUTH") return "true";
        return undefined;
      });

      const context = createMockContext({});

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe("rate limiting", () => {
    it("should allow requests within rate limit", async () => {
      const token = createMockToken({
        sub: "rate-limit-user",
        email: "rate@example.com",
      });

      const context = createMockContext({
        authorization: `Bearer ${token}`,
      });

      // Should allow multiple requests
      for (let i = 0; i < 10; i++) {
        const result = await guard.canActivate(context);
        expect(result).toBe(true);
      }
    });

    // Note: Full rate limit testing would require mocking time or waiting
  });
});

describe("GqlAuthGuard Token Validation", () => {
  let guard: GqlAuthGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GqlAuthGuard,
        {
          provide: Reflector,
          useValue: { get: jest.fn().mockReturnValue(false) },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === "NODE_ENV") return "production";
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    guard = module.get<GqlAuthGuard>(GqlAuthGuard);
  });

  it("should handle tokens with alternative claim names", async () => {
    // Some identity providers use different claim names
    const payload = {
      user_id: "alt-user-123", // Instead of sub
      preferred_username: "alt@example.com", // Instead of email
      org_id: "alt-org-456", // Instead of organization_id
      roles: ["user"], // Instead of realm_access.roles
    };

    const header = Buffer.from(JSON.stringify({ alg: "HS256" })).toString(
      "base64",
    );
    const body = Buffer.from(
      JSON.stringify({
        ...payload,
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).toString("base64");
    const token = `${header}.${body}.signature`;

    const mockRequest = {
      headers: { authorization: `Bearer ${token}` },
      user: undefined as unknown,
    };
    const mockGqlContext = {
      getContext: () => ({ req: mockRequest }),
      getInfo: () => ({
        fieldName: "testQuery",
        parentType: { name: "Query" },
      }),
    };
    (GqlExecutionContext.create as jest.Mock).mockReturnValue(mockGqlContext);

    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;

    await guard.canActivate(context);

    expect((mockRequest.user as Record<string, string>).sub).toBe(
      "alt-user-123",
    );
    expect((mockRequest.user as Record<string, string>).organizationId).toBe(
      "alt-org-456",
    );
  });
});
