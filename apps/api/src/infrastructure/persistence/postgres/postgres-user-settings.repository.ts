import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserSettingsEntity } from "./entities/user-settings.entity";

export interface UpdateUserSettingsInput {
  notificationPreferences?: UserSettingsEntity["notificationPreferences"];
  uiPreferences?: UserSettingsEntity["uiPreferences"];
  featurePreferences?: UserSettingsEntity["featurePreferences"];
}

@Injectable()
export class PostgresUserSettingsRepository {
  private readonly logger = new Logger(PostgresUserSettingsRepository.name);

  constructor(
    @InjectRepository(UserSettingsEntity)
    private readonly repository: Repository<UserSettingsEntity>,
  ) {}

  /**
   * Find settings by user ID
   */
  async findByUserId(userId: string): Promise<UserSettingsEntity | null> {
    return this.repository.findOne({
      where: { userId },
    });
  }

  /**
   * Create or update user settings
   */
  async upsert(
    userId: string,
    input: UpdateUserSettingsInput,
  ): Promise<UserSettingsEntity> {
    const existing = await this.findByUserId(userId);

    if (existing) {
      // Update existing
      if (input.notificationPreferences !== undefined) {
        existing.notificationPreferences = input.notificationPreferences;
      }
      if (input.uiPreferences !== undefined) {
        existing.uiPreferences = input.uiPreferences;
      }
      if (input.featurePreferences !== undefined) {
        existing.featurePreferences = input.featurePreferences;
      }

      const saved = await this.repository.save(existing);
      this.logger.log(`User settings updated: ${userId}`);
      return saved;
    } else {
      // Create new
      const settings = this.repository.create({
        userId,
        ...input,
      });

      const saved = await this.repository.save(settings);
      this.logger.log(`User settings created: ${userId}`);
      return saved;
    }
  }

  /**
   * Update specific setting section
   */
  async updateSection(
    userId: string,
    section: keyof UpdateUserSettingsInput,
    value: any,
  ): Promise<UserSettingsEntity | null> {
    const input: UpdateUserSettingsInput = {
      [section]: value,
    } as any;

    return this.upsert(userId, input);
  }

  /**
   * Delete settings
   */
  async delete(userId: string): Promise<void> {
    await this.repository.delete({ userId });
    this.logger.log(`User settings deleted: ${userId}`);
  }
}
