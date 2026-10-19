import { BadRequestException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { AuthenticatedUser } from '@infrastructure/auth/keycloak-token';
import { OrganizationFeatures, OrganizationFeatureOverrides, OrganizationFeaturesProps } from '@domain/entities/OrganizationFeatures';
import { OrganizationEntity } from '@infrastructure/persistence/postgres/entities/organization.entity';
import { OrganizationFeaturesEntity } from '@infrastructure/persistence/postgres/entities/organization-features.entity';
import { OrganizationSettingsEntity } from '@infrastructure/persistence/postgres/entities/organization-settings.entity';
import { SubscriptionPlanEntity } from '@infrastructure/persistence/postgres/entities/subscription-plan.entity';
import { UserProfileEntity } from '@infrastructure/persistence/postgres/entities/user-profile.entity';

export type OrganizationActor = Pick<AuthenticatedUser, 'sub' | 'organizationId'> & Partial<Pick<AuthenticatedUser, 'roles'>>;
const FEATURE_ENTITLEMENTS = {
  aiInsightsEnabled: 'feature:ai-insights', multiCurrencyEnabled: 'feature:multi-currency',
  customReportsEnabled: 'feature:custom-reports', apiAccessEnabled: 'feature:api-access',
} as const;
export interface OrganizationPolicy {
  organization: OrganizationEntity;
  configuration: OrganizationFeaturesEntity;
  plan: SubscriptionPlanEntity;
  entitlements: string[];
  overrides: string[];
  limits: Record<string, number>;
}

/** Persisted organization configuration and subscription policy shared by API entrypoints. */
@Injectable()
export class OrganizationFeaturePolicyService {
  constructor(private readonly database: DataSource) {}

  async authorize(actor: OrganizationActor, selected?: string, write = false, manager = this.database.manager) {
    if (!actor?.sub || !actor.organizationId) throw new ForbiddenException('An authenticated organization is required');
    const profile = await manager.getRepository(UserProfileEntity).findOne({ where: { id: actor.sub, isActive: true }, relations: ['organization'] });
    if (!profile?.organization || !profile.organizationId || profile.organization.deletedAt || profile.organization.tenantId !== actor.organizationId ||
      (selected !== undefined && ![profile.organizationId, profile.organization.tenantId].includes(selected))) {
      throw new ForbiddenException('Active membership in the selected organization is required');
    }
    if (write && !['owner', 'admin'].includes(profile.role || '')) throw new ForbiddenException('Organization administrator access is required');
    return profile as UserProfileEntity & { organizationId: string; organization: OrganizationEntity };
  }

  async read(organizationId: string, manager: EntityManager = this.database.manager): Promise<OrganizationPolicy> {
    const organization = await manager.getRepository(OrganizationEntity).findOne({ where: { id: organizationId } });
    if (!organization || organization.deletedAt) throw new NotFoundException('Organization not found');
    const [configuration, plan] = await Promise.all([
      manager.getRepository(OrganizationFeaturesEntity).findOne({ where: { organizationId } }),
      manager.getRepository(SubscriptionPlanEntity).findOne({ where: { id: organization.subscriptionPlanId }, relations: ['planEntitlements', 'planEntitlements.entitlement'] }),
    ]);
    if (!configuration || !plan) throw new ServiceUnavailableException('Organization feature or subscription configuration is missing');
    this.validateConfiguration(configuration);
    const entitlements = new Set((plan.planEntitlements || []).map((entry) => entry.entitlement?.id).filter((id): id is string => !!id));
    const overrides: string[] = [];
    for (const [key, entitlement] of Object.entries(FEATURE_ENTITLEMENTS)) {
      const enabled = configuration.overrides[key as keyof typeof FEATURE_ENTITLEMENTS];
      if (enabled === true) { entitlements.add(entitlement); overrides.push(entitlement); }
      if (enabled === false) entitlements.delete(entitlement);
    }
    const limits = { ...plan.limits };
    if (configuration.overrides.maxUsers !== undefined) limits.users = configuration.overrides.maxUsers;
    if (configuration.overrides.maxDataSources !== undefined) limits.connections = configuration.overrides.maxDataSources;
    for (const value of Object.values(limits)) if (!Number.isSafeInteger(value) || value < -1) throw new ServiceUnavailableException('Subscription usage limits are invalid');
    for (const key of ['users', 'connections']) if (limits[key] === undefined) throw new ServiceUnavailableException('Subscription usage limits are not configured');
    return { organization, configuration, plan, entitlements: [...entitlements], overrides, limits };
  }

  async readForActor(actor: OrganizationActor, selected?: string) {
    const profile = await this.authorize(actor, selected);
    return { profile, policy: await this.read(profile.organizationId) };
  }

  async findOrganization(actor: OrganizationActor, selected: string): Promise<OrganizationEntity | null> {
    const profile = await this.authorize(actor);
    if ([profile.organizationId, profile.organization.tenantId].includes(selected)) return profile.organization;
    this.assertPlatformAdministrator(actor);
    if (typeof selected !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(selected)) throw new BadRequestException('Organization identifier is invalid');
    const where = /^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(selected) ? { id: selected } : { tenantId: selected };
    return this.database.manager.getRepository(OrganizationEntity).findOne({ where });
  }

  flags(policy: OrganizationPolicy) {
    return {
      organizationId: policy.organization.id,
      analyticsEnabled: policy.configuration.analytics.plainledger.enabled,
      aiInsightsEnabled: policy.entitlements.includes(FEATURE_ENTITLEMENTS.aiInsightsEnabled),
      multiCurrencyEnabled: policy.entitlements.includes(FEATURE_ENTITLEMENTS.multiCurrencyEnabled),
      customReportsEnabled: policy.entitlements.includes(FEATURE_ENTITLEMENTS.customReportsEnabled),
      apiAccessEnabled: policy.entitlements.includes(FEATURE_ENTITLEMENTS.apiAccessEnabled),
      maxDataSources: policy.limits.connections, maxUsers: policy.limits.users,
    };
  }

  analytics(policy: OrganizationPolicy) {
    return { ...policy.configuration, analytics: {
      plainledger: { ...policy.configuration.analytics.plainledger },
      powerbi: { ...policy.configuration.analytics.powerbi, enabled: policy.configuration.analytics.powerbi.enabled && policy.entitlements.includes('feature:power-bi') },
    } };
  }

  async update(actor: OrganizationActor, organizationId: string, analytics?: Partial<{ [K in keyof OrganizationFeaturesProps['analytics']]: Partial<OrganizationFeaturesProps['analytics'][K]> }>, overrides?: OrganizationFeatureOverrides) {
    this.assertPlatformAdministrator(actor);
    if (!/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(organizationId)) throw new BadRequestException('A canonical organization identifier is required');
    await this.database.transaction(async (manager) => {
      const organization = await manager.getRepository(OrganizationEntity).findOne({ where: { id: organizationId }, lock: { mode: 'pessimistic_write' } });
      if (!organization || organization.deletedAt) throw new NotFoundException('Organization not found');
      const repository = manager.getRepository(OrganizationFeaturesEntity);
      const row = await repository.findOne({ where: { organizationId } });
      const features = row ? OrganizationFeatures.fromPersistence(row) : OrganizationFeatures.create({ organizationId, updatedBy: actor.sub });
      for (const kind of ['plainledger', 'powerbi'] as const) if (analytics?.[kind]) features.updateAnalyticsVisibility(kind, analytics[kind]!, actor.sub);
      if (overrides) features.updateOverrides(overrides, actor.sub);
      const next = repository.create({ id: row?.id, organizationId, analytics: features.analytics, overrides: features.overrides, updatedBy: actor.sub });
      this.validateConfiguration(next);
      await repository.save(next);
    });
    return this.read(organizationId);
  }

  async updateOrganization(actor: OrganizationActor, input: { name?: string; industry?: string; timezone?: string }) {
    if (input.name !== undefined && (!input.name.trim() || input.name.length > 255)) throw new BadRequestException('Organization name is invalid');
    if (input.industry !== undefined && input.industry.length > 100) throw new BadRequestException('Industry is too long');
    if (input.timezone !== undefined) {
      try { new Intl.DateTimeFormat('en', { timeZone: input.timezone }).format(); } catch { throw new BadRequestException('Timezone must be a valid IANA timezone'); }
    }
    return this.database.transaction(async (manager) => {
      const initial = await this.authorize(actor, undefined, true, manager);
      const repository = manager.getRepository(OrganizationEntity);
      const organization = await repository.findOne({ where: { id: initial.organizationId }, lock: { mode: 'pessimistic_write' } });
      if (!organization || organization.deletedAt) throw new ForbiddenException('Organization is unavailable');
      await this.authorize(actor, organization.id, true, manager);
      if (input.name !== undefined) organization.name = input.name.trim();
      if (input.industry !== undefined) organization.industry = input.industry;
      if (input.timezone !== undefined) {
        const settings = manager.getRepository(OrganizationSettingsEntity);
        const row = await settings.findOne({ where: { organizationId: organization.id } });
        await settings.save(settings.create({ ...row, organizationId: organization.id, generalSettings: { ...row?.generalSettings, timezone: input.timezone } }));
      }
      return repository.save(organization);
    });
  }

  assertPlatformAdministrator(actor: OrganizationActor): void {
    if (!actor?.sub || !actor.roles?.some((role) => ['platform_admin', 'platform-admin', 'super_admin', 'super-admin'].includes(role))) {
      throw new ForbiddenException('Only platform administrators may change subscription feature configuration');
    }
  }

  private validateConfiguration(configuration: OrganizationFeaturesEntity): void {
    for (const section of ['plainledger', 'powerbi'] as const) {
      const item = configuration.analytics?.[section];
      if (!item || typeof item.enabled !== 'boolean' || !Array.isArray(item.visibleToRoles) || item.visibleToRoles.length > 50 || item.visibleToRoles.some((role) => typeof role !== 'string' || !role.trim() || role.length > 100)) {
        throw new ServiceUnavailableException('Organization analytics configuration is invalid');
      }
    }
    if (!configuration.overrides || typeof configuration.overrides !== 'object' || Array.isArray(configuration.overrides)) throw new ServiceUnavailableException('Organization feature overrides are invalid');
    try { OrganizationFeatures.fromPersistence(configuration).updateOverrides(configuration.overrides, configuration.updatedBy); }
    catch { throw new ServiceUnavailableException('Organization feature overrides are invalid'); }
  }
}
