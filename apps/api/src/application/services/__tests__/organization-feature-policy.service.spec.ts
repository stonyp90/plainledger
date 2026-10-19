import { DataSource } from 'typeorm';
import { OrganizationFeaturePolicyService } from '../organization-feature-policy.service';
import { OrganizationEntity } from '@infrastructure/persistence/postgres/entities/organization.entity';
import { OrganizationFeaturesEntity } from '@infrastructure/persistence/postgres/entities/organization-features.entity';
import { SubscriptionPlanEntity } from '@infrastructure/persistence/postgres/entities/subscription-plan.entity';
import { UserProfileEntity } from '@infrastructure/persistence/postgres/entities/user-profile.entity';
import { OrganizationSettingsEntity } from '@infrastructure/persistence/postgres/entities/organization-settings.entity';

const organizationId = '00000000-0000-4000-8000-000000000101';
const actor = { sub: 'user-a', organizationId: 'tenant-a', roles: ['owner'] };
describe('Persisted organization feature and subscription policy', () => {
  let service: OrganizationFeaturePolicyService;
  let organization: OrganizationEntity;
  let configuration: OrganizationFeaturesEntity;
  let plan: SubscriptionPlanEntity;
  let profile: UserProfileEntity;
  const organizations = { findOne: jest.fn(), save: jest.fn() };
  const features = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
  const plans = { findOne: jest.fn() }, profiles = { findOne: jest.fn() };
  const settings = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
  const manager = { getRepository: (entity: unknown) => entity === OrganizationEntity ? organizations : entity === OrganizationFeaturesEntity ? features : entity === SubscriptionPlanEntity ? plans : entity === UserProfileEntity ? profiles : entity === OrganizationSettingsEntity ? settings : undefined };
  const database = { manager, transaction: jest.fn() };
  beforeEach(() => {
    jest.resetAllMocks();
    organization = { id: organizationId, tenantId: 'tenant-a', name: 'Acme', subscriptionPlanId: 'professional', createdAt: new Date(), updatedAt: new Date() } as OrganizationEntity;
    configuration = { id: 'feature-record', organizationId, analytics: { plainledger: { enabled: true, visibleToRoles: ['owner', 'member', 'viewer'] }, powerbi: { enabled: true, visibleToRoles: ['owner'] } }, overrides: {}, updatedBy: actor.sub, createdAt: new Date(), updatedAt: new Date() } as OrganizationFeaturesEntity;
    plan = Object.assign(new SubscriptionPlanEntity(), { id: 'professional', name: 'Professional', isActive: true, displayOrder: 1, createdAt: new Date(), updatedAt: new Date(), organizations: [], limits: { users: 10, connections: 5 }, planEntitlements: [{ entitlement: { id: 'feature:ai-insights' } }, { entitlement: { id: 'feature:custom-reports' } }] });
    profile = { id: actor.sub, organizationId, organization, isActive: true, role: 'owner' } as UserProfileEntity;
    organizations.findOne.mockImplementation(async () => organization); organizations.save.mockImplementation(async (value) => value);
    features.findOne.mockImplementation(async () => configuration);
    features.create.mockImplementation((value) => ({ ...configuration, ...value }));
    features.save.mockImplementation(async (value) => { configuration = value; return value; });
    plans.findOne.mockImplementation(async () => plan); profiles.findOne.mockImplementation(async () => profile);
    settings.findOne.mockResolvedValue(null); settings.create.mockImplementation((value) => value); settings.save.mockImplementation(async (value) => value);
    database.transaction.mockImplementation(async (callback) => callback(manager));
    service = new OrganizationFeaturePolicyService(database as unknown as DataSource);
  });
  it('reads canonical UUID, saved analytics and actual subscription limits', async () => {
    const policy = await service.read(organizationId);
    expect(service.flags(policy)).toEqual({ organizationId, analyticsEnabled: true, aiInsightsEnabled: true, customReportsEnabled: true, apiAccessEnabled: false, multiCurrencyEnabled: false, maxDataSources: 5, maxUsers: 10 });
  });
  it('requires both saved enablement and a plan entitlement for Power BI', async () => {
    expect(service.analytics(await service.read(organizationId)).analytics.powerbi.enabled).toBe(false);
    plan.planEntitlements.push({ entitlement: { id: 'feature:power-bi' } } as never);
    expect(service.analytics(await service.read(organizationId)).analytics.powerbi.enabled).toBe(true);
    configuration.analytics.powerbi.enabled = false;
    expect(service.analytics(await service.read(organizationId)).analytics.powerbi.enabled).toBe(false);
  });
  it('applies explicit grants, denials, zero limits and unlimited limits consistently', async () => {
    configuration.overrides = { aiInsightsEnabled: false, apiAccessEnabled: true, maxUsers: -1, maxDataSources: 0 };
    const policy = await service.read(organizationId);
    expect(policy.entitlements).not.toContain('feature:ai-insights');
    expect(policy.overrides).toEqual(['feature:api-access']);
    expect(service.flags(policy)).toMatchObject({ aiInsightsEnabled: false, apiAccessEnabled: true, maxUsers: -1, maxDataSources: 0 });
  });
  it.each(['features', 'plan'])('does not invent defaults when %s configuration is missing', async (kind) => {
    if (kind === 'features') features.findOne.mockResolvedValue(null); else plans.findOne.mockResolvedValue(null);
    await expect(service.read(organizationId)).rejects.toMatchObject({ status: 503 });
  });
  it.each([undefined, NaN, -2, 1.5, Infinity])('rejects invalid connection limit %s', async (value) => {
    plan.limits.connections = value as number;
    await expect(service.read(organizationId)).rejects.toMatchObject({ status: 503 });
  });
  it('rejects corrupt saved analytics or override values', async () => {
    configuration.analytics.plainledger.enabled = 'yes' as unknown as boolean;
    await expect(service.read(organizationId)).rejects.toMatchObject({ status: 503 });
    configuration.analytics.plainledger.enabled = true;
    configuration.overrides = { apiAccessEnabled: 'yes' as unknown as boolean };
    await expect(service.read(organizationId)).rejects.toMatchObject({ status: 503 });
  });
  it('lets a current viewer read their own UUID or slug without management rights', async () => {
    profile.role = 'viewer';
    await expect(service.readForActor(actor, organizationId)).resolves.toMatchObject({ profile: { role: 'viewer' } });
    await expect(service.readForActor(actor, 'tenant-a')).resolves.toBeDefined();
    await expect(service.authorize(actor, undefined, true)).rejects.toMatchObject({ status: 403 });
  });
  it.each(['tenant-b', '00000000-0000-4000-8000-000000000102'])('rejects another organization selector %s', async (selected) => {
    await expect(service.readForActor(actor, selected)).rejects.toMatchObject({ status: 403 });
    expect(features.findOne).not.toHaveBeenCalled();
  });
  it('rejects removed memberships and stale claims after reassignment', async () => {
    profiles.findOne.mockResolvedValueOnce(null);
    await expect(service.authorize(actor)).rejects.toMatchObject({ status: 403 });
    organization.tenantId = 'tenant-b';
    await expect(service.authorize(actor)).rejects.toMatchObject({ status: 403 });
  });
  it('rejects deleted organizations', async () => {
    organization.deletedAt = new Date();
    await expect(service.readForActor(actor)).rejects.toMatchObject({ status: 403 });
    await expect(service.read(organizationId)).rejects.toMatchObject({ status: 404 });
  });
  it.each(['owner', 'admin', 'plainledger_cpa_admin'])('does not let tenant role %s grant paid capabilities', async (role) => {
    await expect(service.update({ ...actor, roles: [role] }, organizationId, undefined, { maxUsers: -1 })).rejects.toMatchObject({ status: 403 });
    expect(database.transaction).not.toHaveBeenCalled();
  });
  it('persists only requested platform feature changes and returns the saved policy', async () => {
    const policy = await service.update({ ...actor, roles: ['platform_admin'] }, organizationId, { plainledger: { enabled: false } }, { apiAccessEnabled: true, maxDataSources: 2 });
    expect(features.save).toHaveBeenCalledWith(expect.objectContaining({ organizationId, updatedBy: actor.sub, overrides: { apiAccessEnabled: true, maxDataSources: 2 } }));
    expect(policy.configuration.analytics.powerbi.enabled).toBe(true);
    expect(service.flags(policy)).toMatchObject({ analyticsEnabled: false, apiAccessEnabled: true, maxDataSources: 2, maxUsers: 10 });
    expect(organizations.findOne).toHaveBeenCalledWith(expect.objectContaining({ lock: { mode: 'pessimistic_write' } }));
  });
  it('propagates persistence failure instead of reporting updated flags', async () => {
    features.save.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(service.update({ ...actor, roles: ['platform_admin'] }, organizationId, { plainledger: { enabled: false } })).rejects.toThrow('database unavailable');
  });
  it('saves organization name and timezone using the current database role', async () => {
    await expect(service.updateOrganization(actor, { name: 'Renamed', timezone: 'America/Toronto' })).resolves.toMatchObject({ name: 'Renamed', tenantId: 'tenant-a' });
    expect(settings.save).toHaveBeenCalledWith(expect.objectContaining({ organizationId, generalSettings: { timezone: 'America/Toronto' } }));
    profile.role = 'viewer';
    await expect(service.updateOrganization(actor, { name: 'Unauthorized' })).rejects.toMatchObject({ status: 403 });
  });
  it('rejects invalid organization names and timezones before changing data', async () => {
    await expect(service.updateOrganization(actor, { name: ' ' })).rejects.toMatchObject({ status: 400 });
    await expect(service.updateOrganization(actor, { timezone: 'not/a-timezone' })).rejects.toMatchObject({ status: 400 });
    expect(organizations.save).not.toHaveBeenCalled();
  });
});
