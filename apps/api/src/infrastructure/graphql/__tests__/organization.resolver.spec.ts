import { OrganizationResolver } from '../resolvers/organization.resolver';
import { OrganizationFeaturePolicyService } from '@application/services/organization-feature-policy.service';
import { OrganizationMembershipService } from '@application/services/organization-membership.service';
import { AuthenticatedUser } from '@infrastructure/auth/keycloak-token';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateOrganizationInput, UpdateOrganizationFeaturesInput } from '../types/organization.types';

const actor: AuthenticatedUser = { sub: 'user-a', userId: 'user-a', email: 'owner@example.test', emailVerified: true, organizationId: 'stable-tenant-slug', roles: ['owner'] };
const context = { req: { user: actor } };
const organization = { id: 'org-uuid', tenantId: actor.organizationId, name: 'Company Name', industry: 'retail', createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-02') };
describe('Organization GraphQL persistence boundary', () => {
  const policy = { authorize: jest.fn(), findOrganization: jest.fn(), readForActor: jest.fn(), flags: jest.fn(), update: jest.fn(), updateOrganization: jest.fn() };
  const membership = { createOwnedOrganization: jest.fn() };
  let resolver: OrganizationResolver;
  beforeEach(() => {
    jest.resetAllMocks();
    policy.authorize.mockResolvedValue({ organization });
    policy.findOrganization.mockResolvedValue(organization);
    policy.readForActor.mockResolvedValue({ policy: { configuration: 'persisted' } });
    policy.flags.mockReturnValue({ organizationId: organization.id, analyticsEnabled: false, aiInsightsEnabled: false, multiCurrencyEnabled: true, customReportsEnabled: false, apiAccessEnabled: false, maxDataSources: 1, maxUsers: 2 });
    policy.updateOrganization.mockResolvedValue({ ...organization, name: 'Saved name' });
    policy.update.mockResolvedValue({ configuration: 'saved policy' });
    membership.createOwnedOrganization.mockResolvedValue(organization);
    resolver = new OrganizationResolver(policy as unknown as OrganizationFeaturePolicyService, membership as unknown as OrganizationMembershipService);
  });
  it('returns the actual tenant slug rather than deriving identity from display name', async () => {
    expect((await resolver.getOrganization(context)).slug).toBe('stable-tenant-slug');
    expect(policy.authorize).toHaveBeenCalledWith(actor);
  });
  it('uses the scoped lookup and propagates authorization or database errors', async () => {
    policy.findOrganization.mockRejectedValueOnce(new Error('Access denied'));
    await expect(resolver.getOrganizationById('foreign-org', context)).rejects.toThrow('Access denied');
    expect(policy.findOrganization).toHaveBeenCalledWith(actor, 'foreign-org');
  });
  it('returns null only when the authorized organization lookup found no row', async () => {
    policy.findOrganization.mockResolvedValue(null);
    await expect(resolver.getOrganizationById('missing-org', context)).resolves.toBeNull();
  });
  it('uses persisted effective policy instead of invented flags and limits', async () => {
    await expect(resolver.getOrganizationFeatures(context)).resolves.toMatchObject({ analyticsEnabled: false, multiCurrencyEnabled: true, maxDataSources: 1, maxUsers: 2 });
    expect(policy.flags).toHaveBeenCalledWith({ configuration: 'persisted' });
  });
  it('creates an organization with a transactional owner binding to the verified claim', async () => {
    await resolver.createOrganization({ name: 'Company Name', industry: 'retail' }, context);
    expect(membership.createOwnedOrganization).toHaveBeenCalledWith(actor, { name: 'Company Name', industry: 'retail', tenantId: actor.organizationId });
  });
  it('returns the saved organization, and never acknowledges failed persistence', async () => {
    expect((await resolver.updateOrganization({ name: 'Submitted name' }, context)).name).toBe('Saved name');
    policy.updateOrganization.mockRejectedValueOnce(new Error('Write failed'));
    await expect(resolver.updateOrganization({ name: 'Submitted name' }, context)).rejects.toThrow('Write failed');
  });
  it('updates only supplied flags without enabling unrelated analytics providers', async () => {
    await resolver.updateOrganizationFeatures(organization.id, { analyticsEnabled: false, maxUsers: 0 }, context);
    expect(policy.update).toHaveBeenCalledWith(actor, organization.id, { plainledger: { enabled: false } }, { maxUsers: 0 });
    expect(policy.flags).toHaveBeenCalledWith({ configuration: 'saved policy' });
  });
  it.each([{ name: ' ' }, { name: 'x'.repeat(256) }, { name: 'Name', timezone: 'not/a-timezone' }])('rejects invalid organization input %j', async (input) => {
    expect((await validate(plainToInstance(CreateOrganizationInput, input))).length).toBeGreaterThan(0);
  });
  it.each([{ maxUsers: -2 }, { maxDataSources: 1.5 }, { analyticsEnabled: 'true' }])('rejects wrong feature input %j', async (input) => {
    expect((await validate(plainToInstance(UpdateOrganizationFeaturesInput, input))).length).toBeGreaterThan(0);
  });
});
