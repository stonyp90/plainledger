/**
 * Organization Resolver Tests
 */
import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { OrganizationResolver } from "../resolvers/organization.resolver";
import { GqlAuthGuard } from "../guards/gql-auth.guard";
import { CreateOrganizationUseCase } from "@application/use-cases/create-organization.use-case";
import { GetOrganizationUseCase } from "@application/use-cases/get-organization.use-case";
import { UpdateOrgFeaturesUseCase } from "@application/use-cases/update-org-features.use-case";

// Mock the guard to always pass in tests
const mockAuthGuard = {
  canActivate: jest.fn().mockReturnValue(true),
};

describe("OrganizationResolver", () => {
  let resolver: OrganizationResolver;
  let createOrgUseCase: jest.Mocked<CreateOrganizationUseCase>;
  let getOrgUseCase: jest.Mocked<GetOrganizationUseCase>;
  let updateFeaturesUseCase: jest.Mocked<UpdateOrgFeaturesUseCase>;

  const mockOrganization = {
    id: "org-123",
    tenantId: "org-123",
    name: "Test Company",
    industry: "Technology",
    fiscalYearEndMonth: 12,
    currency: "CAD",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-15T00:00:00Z",
  };

  const mockContext = {
    req: {
      user: {
        sub: "user-456",
        email: "admin@example.com",
        organizationId: "org-123",
        roles: ["admin", "user"],
      },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationResolver,
        {
          provide: CreateOrganizationUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(mockOrganization),
          },
        },
        {
          provide: GetOrganizationUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(mockOrganization),
          },
        },
        {
          provide: UpdateOrgFeaturesUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: Reflector,
          useValue: { get: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
      ],
    })
      .overrideGuard(GqlAuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    resolver = module.get<OrganizationResolver>(OrganizationResolver);
    createOrgUseCase = module.get(CreateOrganizationUseCase);
    getOrgUseCase = module.get(GetOrganizationUseCase);
    updateFeaturesUseCase = module.get(UpdateOrgFeaturesUseCase);
  });

  describe("getOrganization", () => {
    it("should return the current user organization", async () => {
      const result = await resolver.getOrganization(mockContext);

      expect(result).toBeDefined();
      expect(result.id).toBe("org-123");
      expect(result.name).toBe("Test Company");
      expect(getOrgUseCase.execute).toHaveBeenCalledWith({
        tenantId: "org-123",
      });
    });
  });

  describe("getOrganizationById", () => {
    it("should allow access to own organization", async () => {
      const result = await resolver.getOrganizationById("org-123", mockContext);

      expect(result).toBeDefined();
      expect(result?.id).toBe("org-123");
    });

    it("should allow admin access to any organization", async () => {
      const adminContext = {
        req: {
          user: {
            organizationId: "different-org",
            roles: ["admin"],
          },
        },
      };

      const result = await resolver.getOrganizationById(
        "org-123",
        adminContext,
      );

      expect(result).toBeDefined();
    });

    it("should deny non-admin access to other organizations", async () => {
      const userContext = {
        req: {
          user: {
            organizationId: "different-org",
            roles: ["user"],
          },
        },
      };

      await expect(
        resolver.getOrganizationById("org-123", userContext),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("getOrganizationFeatures", () => {
    it("should return feature flags for organization", async () => {
      const result = await resolver.getOrganizationFeatures(mockContext);

      expect(result).toBeDefined();
      expect(result.organizationId).toBe("org-123");
      expect(result.analyticsEnabled).toBe(true);
      expect(result.maxDataSources).toBe(5);
    });
  });

  describe("createOrganization", () => {
    it("should create a new organization", async () => {
      const input = {
        name: "New Company",
        industry: "Finance",
      };

      const result = await resolver.createOrganization(input, mockContext);

      expect(result).toBeDefined();
      expect(createOrgUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "New Company",
          industry: "Finance",
        }),
      );
    });
  });

  describe("updateOrganization", () => {
    it("should update organization for admin", async () => {
      const input = { name: "Updated Name" };

      const result = await resolver.updateOrganization(input, mockContext);

      expect(result).toBeDefined();
      expect(result.name).toBe("Updated Name");
    });

    it("should deny update for non-admin users", async () => {
      const userContext = {
        req: {
          user: {
            organizationId: "org-123",
            roles: ["user"],
          },
        },
      };

      await expect(
        resolver.updateOrganization({ name: "New Name" }, userContext),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should allow update for owners", async () => {
      const ownerContext = {
        req: {
          user: {
            organizationId: "org-123",
            roles: ["owner"],
          },
        },
      };

      const result = await resolver.updateOrganization(
        { name: "Owner Updated" },
        ownerContext,
      );

      expect(result).toBeDefined();
    });
  });

  describe("updateOrganizationFeatures", () => {
    it("should allow platform-admin to update features", async () => {
      const platformAdminContext = {
        req: {
          user: {
            roles: ["platform-admin"],
          },
        },
      };

      const input = {
        analyticsEnabled: true,
        maxDataSources: 10,
      };

      const result = await resolver.updateOrganizationFeatures(
        "org-123",
        input,
        platformAdminContext,
      );

      expect(result).toBeDefined();
      expect(updateFeaturesUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: "org-123",
        }),
      );
    });

    it("should deny feature updates for regular admins", async () => {
      await expect(
        resolver.updateOrganizationFeatures(
          "org-123",
          { maxDataSources: 100 },
          mockContext,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});

describe("OrganizationResolver Security", () => {
  it("should enforce tenant isolation - users cannot access other orgs", async () => {
    const mockOrg = {
      id: "org-123",
      tenantId: "org-123",
      name: "Test",
      currency: "CAD",
      fiscalYearEndMonth: 12,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationResolver,
        {
          provide: CreateOrganizationUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: GetOrganizationUseCase,
          useValue: { execute: jest.fn().mockResolvedValue(mockOrg) },
        },
        {
          provide: UpdateOrgFeaturesUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: Reflector,
          useValue: { get: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
      ],
    })
      .overrideGuard(GqlAuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    const resolver = module.get<OrganizationResolver>(OrganizationResolver);

    const userContext = {
      req: {
        user: {
          organizationId: "user-org",
          roles: ["user"],
        },
      },
    };

    await expect(
      resolver.getOrganizationById("other-org", userContext),
    ).rejects.toThrow(ForbiddenException);
  });
});
