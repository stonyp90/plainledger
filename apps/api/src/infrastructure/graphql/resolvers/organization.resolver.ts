/**
 * Organization Resolver
 *
 * GraphQL resolver for organization management.
 * Follows clean architecture: delegates to use cases.
 *
 * Security:
 * - All operations require authentication
 * - Users can only access their own organization
 * - Admin operations require elevated permissions
 */
import { Resolver, Query, Mutation, Args, Context } from "@nestjs/graphql";
import {
  UseGuards,
  Logger,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { GqlAuthGuard } from "../guards/gql-auth.guard";
import {
  Organization,
  OrganizationFeatures,
  CreateOrganizationInput,
  UpdateOrganizationInput,
  UpdateOrganizationFeaturesInput,
} from "../types";
import { CreateOrganizationUseCase } from "@application/use-cases/create-organization.use-case";
import { GetOrganizationUseCase } from "@application/use-cases/get-organization.use-case";
import { UpdateOrgFeaturesUseCase } from "@application/use-cases/update-org-features.use-case";

@Resolver(() => Organization)
@UseGuards(GqlAuthGuard)
@Injectable()
export class OrganizationResolver {
  private readonly logger = new Logger(OrganizationResolver.name);

  constructor(
    private readonly createOrganizationUseCase: CreateOrganizationUseCase,
    private readonly getOrganizationUseCase: GetOrganizationUseCase,
    private readonly updateOrgFeaturesUseCase: UpdateOrgFeaturesUseCase,
  ) {}

  // =====================================================
  // QUERIES
  // =====================================================

  @Query(() => Organization, {
    name: "organization",
    description: "Get the current user's organization",
  })
  async getOrganization(
    @Context()
    context: {
      req: { user: { organizationId: string; sub: string } };
    },
  ): Promise<Organization> {
    const { organizationId, sub: userId } = context.req.user;
    this.logger.log(`User ${userId} fetching organization ${organizationId}`);

    try {
      const org = await this.getOrganizationUseCase.execute({
        tenantId: organizationId,
      });

      return {
        id: org.id,
        name: org.name,
        slug: org.name.toLowerCase().replace(/\s+/g, "-"),
        industry: org.industry,
        createdAt: new Date(org.createdAt),
        updatedAt: new Date(org.updatedAt),
      };
    } catch (error) {
      this.logger.error(`Failed to fetch organization: ${error}`);
      throw error;
    }
  }

  @Query(() => Organization, {
    name: "organizationById",
    description: "Get organization by ID (admin only)",
    nullable: true,
  })
  async getOrganizationById(
    @Args("id") id: string,
    @Context()
    context: { req: { user: { roles: string[]; organizationId: string } } },
  ): Promise<Organization | null> {
    // Security: Only allow access to own org or if admin
    const isAdmin = context.req.user.roles?.includes("admin");
    const isOwnOrg = context.req.user.organizationId === id;

    if (!isAdmin && !isOwnOrg) {
      this.logger.warn(`Unauthorized access attempt to org ${id}`);
      throw new ForbiddenException("Access denied");
    }

    try {
      const org = await this.getOrganizationUseCase.execute({ tenantId: id });

      return {
        id: org.id,
        name: org.name,
        slug: org.name.toLowerCase().replace(/\s+/g, "-"),
        industry: org.industry,
        createdAt: new Date(org.createdAt),
        updatedAt: new Date(org.updatedAt),
      };
    } catch (error) {
      this.logger.error(`Failed to fetch organization by ID: ${error}`);
      return null;
    }
  }

  @Query(() => OrganizationFeatures, {
    name: "organizationFeatures",
    description: "Get feature flags for the current organization",
  })
  async getOrganizationFeatures(
    @Context() context: { req: { user: { organizationId: string } } },
  ): Promise<OrganizationFeatures> {
    const { organizationId } = context.req.user;
    this.logger.log(`Fetching features for org: ${organizationId}`);

    // Return default features - would normally fetch from database
    return {
      organizationId,
      analyticsEnabled: true,
      aiInsightsEnabled: true,
      multiCurrencyEnabled: false,
      customReportsEnabled: true,
      apiAccessEnabled: true,
      maxDataSources: 5,
      maxUsers: 10,
    };
  }

  // =====================================================
  // MUTATIONS
  // =====================================================

  @Mutation(() => Organization, {
    name: "createOrganization",
    description: "Create a new organization",
  })
  async createOrganization(
    @Args("input") input: CreateOrganizationInput,
    @Context() context: { req: { user: { sub: string; email: string } } },
  ): Promise<Organization> {
    const { sub: userId, email } = context.req.user;
    this.logger.log(`User ${userId} creating organization: ${input.name}`);

    try {
      // Generate a tenant ID for the new organization
      const tenantId = `tenant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const org = await this.createOrganizationUseCase.execute({
        tenantId,
        name: input.name,
        industry: input.industry,
      });

      return {
        id: org.id,
        name: org.name,
        slug: org.name.toLowerCase().replace(/\s+/g, "-"),
        industry: org.industry,
        createdAt: new Date(org.createdAt),
        updatedAt: new Date(org.createdAt),
      };
    } catch (error) {
      this.logger.error(`Failed to create organization: ${error}`);
      throw error;
    }
  }

  @Mutation(() => Organization, {
    name: "updateOrganization",
    description: "Update organization details",
  })
  async updateOrganization(
    @Args("input") input: UpdateOrganizationInput,
    @Context()
    context: { req: { user: { organizationId: string; roles: string[] } } },
  ): Promise<Organization> {
    const { organizationId, roles } = context.req.user;

    // Security: Only admins and owners can update
    const canUpdate = roles?.includes("admin") || roles?.includes("owner");
    if (!canUpdate) {
      throw new ForbiddenException(
        "Insufficient permissions to update organization",
      );
    }

    this.logger.log(`Updating organization ${organizationId}`);

    try {
      // Would normally call an update use case
      const org = await this.getOrganizationUseCase.execute({
        tenantId: organizationId,
      });

      return {
        id: org.id,
        name: input.name || org.name,
        slug: (input.name || org.name).toLowerCase().replace(/\s+/g, "-"),
        industry: input.industry || org.industry,
        createdAt: new Date(org.createdAt),
        updatedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to update organization: ${error}`);
      throw error;
    }
  }

  @Mutation(() => OrganizationFeatures, {
    name: "updateOrganizationFeatures",
    description: "Update organization feature flags (admin only)",
  })
  async updateOrganizationFeatures(
    @Args("organizationId") organizationId: string,
    @Args("input") input: UpdateOrganizationFeaturesInput,
    @Context() context: { req: { user: { roles: string[] } } },
  ): Promise<OrganizationFeatures> {
    // Security: Only platform admins can update features
    const isAdmin = context.req.user.roles?.includes("platform-admin");
    if (!isAdmin) {
      throw new ForbiddenException(
        "Only platform administrators can update features",
      );
    }

    this.logger.log(`Updating features for org: ${organizationId}`);

    try {
      // Map GraphQL input to use case request format
      await this.updateOrgFeaturesUseCase.execute({
        organizationId,
        analytics: {
          plainledger: {
            enabled: input.analyticsEnabled ?? true,
            visibleToRoles: ["admin", "user"],
          },
          powerbi: {
            enabled: input.analyticsEnabled ?? true,
            visibleToRoles: ["admin"],
          },
        },
        updatedBy: context.req.user.roles?.includes("platform-admin")
          ? "platform-admin"
          : "admin",
      });

      return {
        organizationId,
        analyticsEnabled: input.analyticsEnabled ?? true,
        aiInsightsEnabled: input.aiInsightsEnabled ?? true,
        multiCurrencyEnabled: input.multiCurrencyEnabled ?? false,
        customReportsEnabled: input.customReportsEnabled ?? true,
        apiAccessEnabled: input.apiAccessEnabled ?? true,
        maxDataSources: input.maxDataSources ?? 5,
        maxUsers: input.maxUsers ?? 10,
      };
    } catch (error) {
      this.logger.error(`Failed to update features: ${error}`);
      throw error;
    }
  }
}
