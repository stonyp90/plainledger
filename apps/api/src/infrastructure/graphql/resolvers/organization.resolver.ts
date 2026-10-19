import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UseGuards, Injectable } from '@nestjs/common';
import { GqlAuthGuard } from '../guards/gql-auth.guard';
import { Organization, OrganizationFeatures, CreateOrganizationInput, UpdateOrganizationInput, UpdateOrganizationFeaturesInput } from '../types';
import { OrganizationFeaturePolicyService } from '@application/services/organization-feature-policy.service';
import { OrganizationMembershipService } from '@application/services/organization-membership.service';
import { AuthenticatedUser } from '@infrastructure/auth/keycloak-token';

type ActorContext = { req: { user: AuthenticatedUser } };
type OrganizationRow = { id: string; tenantId: string; name: string; industry?: string; createdAt: Date | string; updatedAt?: Date | string };

@Resolver(() => Organization)
@UseGuards(GqlAuthGuard)
@Injectable()
export class OrganizationResolver {
  constructor(private readonly policy: OrganizationFeaturePolicyService, private readonly membership: OrganizationMembershipService) {}

  @Query(() => Organization, { name: 'organization', description: "Get the current user's organization" })
  async getOrganization(@Context() context: ActorContext): Promise<Organization> {
    return this.view((await this.policy.authorize(context.req.user)).organization);
  }

  @Query(() => Organization, { name: 'organizationById', nullable: true, description: 'Get the authenticated organization by its identifier or tenant slug' })
  async getOrganizationById(@Args('id') id: string, @Context() context: ActorContext): Promise<Organization | null> {
    const organization = await this.policy.findOrganization(context.req.user, id);
    return organization ? this.view(organization) : null;
  }

  @Query(() => OrganizationFeatures, { name: 'organizationFeatures', description: 'Get persisted organization features and effective subscription limits' })
  async getOrganizationFeatures(@Context() context: ActorContext): Promise<OrganizationFeatures> {
    return this.policy.flags((await this.policy.readForActor(context.req.user)).policy);
  }

  @Mutation(() => Organization, { name: 'createOrganization', description: 'Create the claimed organization and its owner membership' })
  async createOrganization(@Args('input') input: CreateOrganizationInput, @Context() context: ActorContext): Promise<Organization> {
    const result = await this.membership.createOwnedOrganization(context.req.user, { name: input.name, industry: input.industry, tenantId: context.req.user.organizationId });
    if (input.timezone !== undefined) return this.view(await this.policy.updateOrganization(context.req.user, { timezone: input.timezone }));
    return this.view(result);
  }

  @Mutation(() => Organization, { name: 'updateOrganization', description: 'Persist organization details using current administrator membership' })
  async updateOrganization(@Args('input') input: UpdateOrganizationInput, @Context() context: ActorContext): Promise<Organization> {
    return this.view(await this.policy.updateOrganization(context.req.user, input));
  }

  @Mutation(() => OrganizationFeatures, { name: 'updateOrganizationFeatures', description: 'Persist feature policy and overrides (platform administrator only)' })
  async updateOrganizationFeatures(@Args('organizationId') organizationId: string, @Args('input') input: UpdateOrganizationFeaturesInput, @Context() context: ActorContext): Promise<OrganizationFeatures> {
    const { analyticsEnabled, ...overrides } = input;
    const policy = await this.policy.update(context.req.user, organizationId,
      analyticsEnabled === undefined ? undefined : { plainledger: { enabled: analyticsEnabled } },
      Object.fromEntries(Object.entries(overrides).filter(([, value]) => value !== undefined)),
    );
    return this.policy.flags(policy);
  }

  private view(row: OrganizationRow): Organization {
    return { id: row.id, name: row.name, slug: row.tenantId, industry: row.industry, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt || row.createdAt) };
  }
}
