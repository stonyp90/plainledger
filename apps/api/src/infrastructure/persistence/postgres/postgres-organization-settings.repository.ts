import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { OrganizationSettingsEntity } from "./entities/organization-settings.entity";
import { validateOrganizationSettings } from '@infrastructure/services/settings-validation';

export interface UpdateOrganizationSettingsInput {
  thresholdSettings?: OrganizationSettingsEntity["thresholdSettings"];
  brandingSettings?: OrganizationSettingsEntity["brandingSettings"];
  notificationIntegrations?: OrganizationSettingsEntity["notificationIntegrations"];
  analyticsConfig?: OrganizationSettingsEntity["analyticsConfig"];
  generalSettings?: OrganizationSettingsEntity["generalSettings"];
}

@Injectable()
export class PostgresOrganizationSettingsRepository {
  private readonly logger = new Logger(
    PostgresOrganizationSettingsRepository.name,
  );

  constructor(
    @InjectRepository(OrganizationSettingsEntity)
    private readonly repository: Repository<OrganizationSettingsEntity>,
  ) {}

  /**
   * Find settings by organization ID
   */
  async findByOrganizationId(
    organizationId: string,
  ): Promise<OrganizationSettingsEntity | null> {
    return this.repository.findOne({
      where: { organizationId },
    });
  }

  /**
   * Create or update organization settings
   */
  async upsert(
    organizationId: string,
    input: UpdateOrganizationSettingsInput,
  ): Promise<OrganizationSettingsEntity> {
    validateOrganizationSettings(input);
    const existing = await this.findByOrganizationId(organizationId);

    if (existing) {
      // Update existing
      if (input.thresholdSettings !== undefined) {
        existing.thresholdSettings = input.thresholdSettings;
      }
      if (input.brandingSettings !== undefined) {
        existing.brandingSettings = input.brandingSettings;
      }
      if (input.notificationIntegrations !== undefined) {
        existing.notificationIntegrations = input.notificationIntegrations;
      }
      if (input.analyticsConfig !== undefined) {
        existing.analyticsConfig = input.analyticsConfig;
      }
      if (input.generalSettings !== undefined) {
        existing.generalSettings = input.generalSettings;
      }

      const saved = await this.repository.save(existing);
      this.logger.log(`Organization settings updated: ${organizationId}`);
      return saved;
    } else {
      // Create new
      const settings = this.repository.create({
        organizationId,
        thresholdSettings: input.thresholdSettings,
        brandingSettings: input.brandingSettings,
        notificationIntegrations: input.notificationIntegrations,
        analyticsConfig: input.analyticsConfig,
        generalSettings: input.generalSettings,
      });

      const saved = await this.repository.save(settings);
      this.logger.log(`Organization settings created: ${organizationId}`);
      return saved;
    }
  }

  /**
   * Update specific setting section
   */
  async updateSection(
    organizationId: string,
    section: keyof UpdateOrganizationSettingsInput,
    value: any,
  ): Promise<OrganizationSettingsEntity | null> {
    const input: UpdateOrganizationSettingsInput = {
      [section]: value,
    } as any;

    return this.upsert(organizationId, input);
  }

  /**
   * Delete settings (cascade delete handled by DB)
   */
  async delete(organizationId: string): Promise<void> {
    await this.repository.delete({ organizationId });
    this.logger.log(`Organization settings deleted: ${organizationId}`);
  }
}
