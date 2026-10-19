import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { Roles } from "nest-keycloak-connect";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { AuthenticatedUser } from "../../auth/keycloak-token";
import { validateOrganizationSettings, validateUserSettings } from '@infrastructure/services/settings-validation';
import { SettingsService } from "@infrastructure/services/settings.service";
import { PostgresOrganizationSettingsRepository } from "@infrastructure/persistence/postgres/postgres-organization-settings.repository";
import { PostgresUserSettingsRepository } from "@infrastructure/persistence/postgres/postgres-user-settings.repository";
import { PostgresUserProfileRepository } from "@infrastructure/persistence/postgres/postgres-user-profile.repository";

/**
 * Settings Controller
 * Handles all settings-related API endpoints
 */
@Controller("v1/settings")
@UseGuards(JwtAuthGuard)
export class SettingsController {
  private readonly logger = new Logger(SettingsController.name);

  constructor(
    private readonly settingsService: SettingsService,
    private readonly orgSettingsRepo: PostgresOrganizationSettingsRepository,
    private readonly userSettingsRepo: PostgresUserSettingsRepository,
    private readonly userProfileRepo: PostgresUserProfileRepository,
  ) {}

  /**
   * Helper to get organization ID from user
   */
  private async getOrganizationIdFromUser(req: { user?: AuthenticatedUser }, requireWrite = false): Promise<string> {
    const userId = req.user?.sub;
    if (!userId) {
      throw new BadRequestException("User ID not found in token");
    }

    // Get user profile to find organization ID
    const userProfile = await this.userProfileRepo.findActiveWithOrganization(userId);
    if (!userProfile?.organizationId || !userProfile.organization || userProfile.organization.deletedAt ||
      ![userProfile.organizationId, userProfile.organization.tenantId].includes(req.user?.organizationId || "")) {
      this.logger.warn(`User ${userId} has no organizationId`);
      throw new ForbiddenException(
        "Active membership in the authenticated organization is required",
      );
    }

    if (requireWrite && !["owner", "admin"].includes(userProfile.role || "")) {
      throw new ForbiddenException("Organization administrator access required");
    }
    return userProfile.organizationId;
  }

  // ============================================================================
  // Organization Settings
  // ============================================================================

  /**
   * Get organization settings
   * GET /api/v1/settings/organization
   */
  @Get("organization")
  @Roles({ roles: ["user", "member", "viewer", "accountant", "admin", "owner"] })
  async getOrganizationSettings(@Request() req: any) {
    try {
      const organizationId = await this.getOrganizationIdFromUser(req);
      const settings =
        await this.settingsService.getOrganizationSettings(organizationId);
      return settings || {};
    } catch (error) {
      this.logger.error(
        `Failed to get organization settings: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Update organization settings
   * PUT /api/v1/settings/organization
   */
  @Put("organization")
  @HttpCode(HttpStatus.OK)
  @Roles({ roles: ["admin", "owner"] })
  async updateOrganizationSettings(@Request() req: any, @Body() body: any) {
    try {
      const organizationId = await this.getOrganizationIdFromUser(req, true);
      const updated = await this.settingsService.updateOrganizationSettings(
        organizationId,
        (validateOrganizationSettings(body), body),
      );
      return updated;
    } catch (error) {
      this.logger.error(
        `Failed to update organization settings: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Update organization threshold settings
   * PUT /api/v1/settings/organization/thresholds
   */
  @Put("organization/thresholds")
  @HttpCode(HttpStatus.OK)
  @Roles({ roles: ["admin", "owner"] })
  async updateOrganizationThresholds(
    @Request() req: any,
    @Body() thresholds: any,
  ) {
    try {
      const organizationId = await this.getOrganizationIdFromUser(req, true);
      const updated = await this.settingsService.updateOrganizationThresholds(
        organizationId,
        (validateOrganizationSettings({ thresholdSettings: thresholds }), thresholds),
      );
      return updated;
    } catch (error) {
      this.logger.error(`Failed to update thresholds: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update organization branding settings
   * PUT /api/v1/settings/organization/branding
   */
  @Put("organization/branding")
  @HttpCode(HttpStatus.OK)
  @Roles({ roles: ["admin", "owner"] })
  async updateOrganizationBranding(@Request() req: any, @Body() branding: any) {
    try {
      const organizationId = await this.getOrganizationIdFromUser(req, true);
      const updated = await this.settingsService.updateOrganizationBranding(
        organizationId,
        (validateOrganizationSettings({ brandingSettings: branding }), branding),
      );
      return updated;
    } catch (error) {
      this.logger.error(`Failed to update branding: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update organization notification integrations
   * PUT /api/v1/settings/organization/notifications
   */
  @Put("organization/notifications")
  @HttpCode(HttpStatus.OK)
  @Roles({ roles: ["admin", "owner"] })
  async updateOrganizationNotificationIntegrations(
    @Request() req: any,
    @Body() integrations: any,
  ) {
    try {
      const organizationId = await this.getOrganizationIdFromUser(req, true);
      const updated =
        await this.settingsService.updateOrganizationNotificationIntegrations(
          organizationId,
          (validateOrganizationSettings({ notificationIntegrations: integrations }), integrations),
        );
      return updated;
    } catch (error) {
      this.logger.error(
        `Failed to update notification integrations: ${error.message}`,
      );
      throw error;
    }
  }

  // ============================================================================
  // User Settings
  // ============================================================================

  /**
   * Get user settings
   * GET /api/v1/settings/user
   * Accessible to all authenticated users (including demo users)
   */
  @Get("user")
  @Roles({ roles: ["user", "member", "viewer", "admin", "owner", "accountant"] })
  async getUserSettings(@Request() req: any) {
    try {
      const userId = req.user?.sub || req.user?.id;
      if (!userId) {
        throw new BadRequestException("User ID not found in token");
      }

      const settings = await this.settingsService.getUserSettings(userId);
      // Return empty object if no settings found (for demo users)
      return settings || {};
    } catch (error) {
      this.logger.warn(
        `Failed to get user settings for ${req.user?.sub || 'unknown'}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Update user settings
   * PUT /api/v1/settings/user
   * Accessible to all authenticated users (including demo users)
   */
  @Put("user")
  @HttpCode(HttpStatus.OK)
  @Roles({ roles: ["user", "member", "viewer", "admin", "owner", "accountant"] })
  async updateUserSettings(@Request() req: any, @Body() body: any) {
    try {
      const userId = req.user?.sub || req.user?.id;
      if (!userId) {
        throw new BadRequestException("User ID not found in token");
      }

      const updated = await this.settingsService.updateUserSettings(
        userId,
        (validateUserSettings(body), body),
      );
      return updated;
    } catch (error) {
      this.logger.error(`Failed to update user settings: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update user notification preferences
   * PUT /api/v1/settings/user/notifications
   * Accessible to all authenticated users (including demo users)
   */
  @Put("user/notifications")
  @HttpCode(HttpStatus.OK)
  @Roles({ roles: ["user", "member", "viewer", "admin", "owner", "accountant"] })
  async updateUserNotificationPreferences(
    @Request() req: any,
    @Body() preferences: any,
  ) {
    try {
      const userId = req.user?.sub || req.user?.id;
      if (!userId) {
        throw new BadRequestException("User ID not found in token");
      }

      const updated =
        await this.settingsService.updateUserNotificationPreferences(
          userId,
          (validateUserSettings({ notificationPreferences: preferences }), preferences),
        );
      return updated;
    } catch (error) {
      this.logger.error(
        `Failed to update notification preferences: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Update user UI preferences
   * PUT /api/v1/settings/user/ui
   * Accessible to all authenticated users (including demo users)
   */
  @Put("user/ui")
  @HttpCode(HttpStatus.OK)
  @Roles({ roles: ["user", "member", "viewer", "admin", "owner", "accountant"] })
  async updateUserUIPreferences(@Request() req: any, @Body() preferences: any) {
    try {
      const userId = req.user?.sub || req.user?.id;
      if (!userId) {
        throw new BadRequestException("User ID not found in token");
      }

      const updated = await this.settingsService.updateUserUIPreferences(
        userId,
        (validateUserSettings({ uiPreferences: preferences }), preferences),
      );
      return updated;
    } catch (error) {
      this.logger.error(`Failed to update UI preferences: ${error.message}`);
      throw error;
    }
  }
}
