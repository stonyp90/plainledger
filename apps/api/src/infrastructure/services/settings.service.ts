import { Injectable, Logger } from "@nestjs/common";
import { PostgresOrganizationSettingsRepository } from "@infrastructure/persistence/postgres/postgres-organization-settings.repository";
import { PostgresUserSettingsRepository } from "@infrastructure/persistence/postgres/postgres-user-settings.repository";
import { CacheService } from "@infrastructure/cache/cache.service";
import { OrganizationSettingsEntity } from "@infrastructure/persistence/postgres/entities/organization-settings.entity";
import { UserSettingsEntity } from "@infrastructure/persistence/postgres/entities/user-settings.entity";

/**
 * Settings Service
 * Provides unified interface for managing all settings with caching
 */
@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  private readonly settingsCacheTtl = 1800; // 30 minutes

  constructor(
    private readonly orgSettingsRepo: PostgresOrganizationSettingsRepository,
    private readonly userSettingsRepo: PostgresUserSettingsRepository,
    private readonly cache: CacheService,
  ) {}

  // ============================================================================
  // Organization Settings
  // ============================================================================

  /**
   * Get organization settings with caching
   */
  async getOrganizationSettings(
    organizationId: string,
  ): Promise<OrganizationSettingsEntity | null> {
    const cacheKey = this.cache.getOrganizationSettingsKey(organizationId);

    // Try cache first
    const cached = await this.cache.get<OrganizationSettingsEntity>(cacheKey);
    if (cached) {
      this.logger.debug(
        `Cache hit for organization settings: ${organizationId}`,
      );
      return cached;
    }

    // Fetch from database
    const settings =
      await this.orgSettingsRepo.findByOrganizationId(organizationId);

    // Cache the result (even if null, cache for a short time to avoid repeated DB queries)
    if (settings) {
      await this.cache.set(cacheKey, settings, this.settingsCacheTtl);
    } else {
      // Cache null for shorter time to allow for new settings creation
      await this.cache.set(cacheKey, null, 300); // 5 minutes
    }

    return settings;
  }

  /**
   * Update organization settings
   */
  async updateOrganizationSettings(
    organizationId: string,
    updates: Partial<OrganizationSettingsEntity>,
  ): Promise<OrganizationSettingsEntity> {
    // Update in database
    const updated = await this.orgSettingsRepo.upsert(organizationId, updates);

    // Invalidate cache
    await this.cache.invalidateOrganizationSettings(organizationId);

    this.logger.log(`Organization settings updated: ${organizationId}`);
    return updated;
  }

  /**
   * Update organization threshold settings
   */
  async updateOrganizationThresholds(
    organizationId: string,
    thresholds: OrganizationSettingsEntity["thresholdSettings"],
  ): Promise<OrganizationSettingsEntity> {
    return this.updateOrganizationSettings(organizationId, {
      thresholdSettings: thresholds,
    });
  }

  /**
   * Update organization branding settings
   */
  async updateOrganizationBranding(
    organizationId: string,
    branding: OrganizationSettingsEntity["brandingSettings"],
  ): Promise<OrganizationSettingsEntity> {
    return this.updateOrganizationSettings(organizationId, {
      brandingSettings: branding,
    });
  }

  /**
   * Update organization notification integrations
   */
  async updateOrganizationNotificationIntegrations(
    organizationId: string,
    integrations: OrganizationSettingsEntity["notificationIntegrations"],
  ): Promise<OrganizationSettingsEntity> {
    return this.updateOrganizationSettings(organizationId, {
      notificationIntegrations: integrations,
    });
  }

  // ============================================================================
  // User Settings
  // ============================================================================

  /**
   * Get user settings with caching
   */
  async getUserSettings(userId: string): Promise<UserSettingsEntity | null> {
    const cacheKey = this.cache.getUserSettingsKey(userId);

    // Try cache first
    const cached = await this.cache.get<UserSettingsEntity>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for user settings: ${userId}`);
      return cached;
    }

    // Fetch from database
    const settings = await this.userSettingsRepo.findByUserId(userId);

    // Cache the result
    if (settings) {
      await this.cache.set(cacheKey, settings, this.settingsCacheTtl);
    } else {
      await this.cache.set(cacheKey, null, 300); // 5 minutes
    }

    return settings;
  }

  /**
   * Update user settings
   */
  async updateUserSettings(
    userId: string,
    updates: Partial<UserSettingsEntity>,
  ): Promise<UserSettingsEntity> {
    // Update in database
    const updated = await this.userSettingsRepo.upsert(userId, updates);

    // Invalidate cache
    await this.cache.invalidateUserSettings(userId);

    this.logger.log(`User settings updated: ${userId}`);
    return updated;
  }

  /**
   * Update user notification preferences
   */
  async updateUserNotificationPreferences(
    userId: string,
    preferences: UserSettingsEntity["notificationPreferences"],
  ): Promise<UserSettingsEntity> {
    return this.updateUserSettings(userId, {
      notificationPreferences: preferences,
    });
  }

  /**
   * Update user UI preferences
   */
  async updateUserUIPreferences(
    userId: string,
    preferences: UserSettingsEntity["uiPreferences"],
  ): Promise<UserSettingsEntity> {
    return this.updateUserSettings(userId, {
      uiPreferences: preferences,
    });
  }
}
