/**
 * User Settings Resolver
 *
 * GraphQL resolver for user settings management including chart preferences.
 * All operations require authentication.
 * 
 * Supports:
 * - Individual setting updates
 * - Batch sync for offline-first pattern
 * - Chart lock/unlock functionality
 */
import { Resolver, Query, Mutation, Args, Context } from "@nestjs/graphql";
import { UseGuards, Logger, Injectable } from "@nestjs/common";
import { GqlAuthGuard } from "../guards/gql-auth.guard";
import {
  UserSettings,
  UpdateUserSettingsInput,
  ChartPreferences,
  ChartPreferencesInput,
  BatchSyncSettingsInput,
  BatchSyncResult,
  ChartLockResult,
} from "../types";
import { PostgresUserSettingsRepository } from "../../persistence/postgres/postgres-user-settings.repository";

@Resolver(() => UserSettings)
@UseGuards(GqlAuthGuard)
@Injectable()
export class UserSettingsResolver {
  private readonly logger = new Logger(UserSettingsResolver.name);

  constructor(
    private readonly userSettingsRepository: PostgresUserSettingsRepository,
  ) {}

  // =====================================================
  // QUERIES
  // =====================================================

  @Query(() => UserSettings, {
    name: "userSettings",
    description: "Get the current user's settings",
    nullable: true,
  })
  async getUserSettings(
    @Context() context: { req: { user: { sub: string } } },
  ): Promise<UserSettings | null> {
    const userId = context.req.user.sub;
    this.logger.log(`Fetching settings for user: ${userId}`);

    try {
      const settings = await this.userSettingsRepository.findByUserId(userId);

      if (!settings) {
        // Return default settings if none exist
        return {
          userId,
          chartPreferences: undefined,
          notificationPreferences: undefined,
          uiPreferences: undefined,
          featurePreferences: undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      return {
        userId: settings.userId,
        notificationPreferences: settings.notificationPreferences,
        uiPreferences: settings.uiPreferences,
        featurePreferences: settings.featurePreferences,
        chartPreferences: settings.chartPreferences as ChartPreferences,
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch user settings: ${error}`);
      return null;
    }
  }

  @Query(() => ChartPreferences, {
    name: "chartPreferences",
    description: "Get the current user's chart preferences",
    nullable: true,
  })
  async getChartPreferences(
    @Context() context: { req: { user: { sub: string } } },
  ): Promise<ChartPreferences | null> {
    const userId = context.req.user.sub;
    this.logger.log(`Fetching chart preferences for user: ${userId}`);

    try {
      const settings = await this.userSettingsRepository.findByUserId(userId);
      return (settings?.chartPreferences as ChartPreferences) || null;
    } catch (error) {
      this.logger.error(`Failed to fetch chart preferences: ${error}`);
      return null;
    }
  }

  // =====================================================
  // MUTATIONS
  // =====================================================

  @Mutation(() => UserSettings, {
    name: "updateUserSettings",
    description: "Update user settings",
  })
  async updateUserSettings(
    @Args("input") input: UpdateUserSettingsInput,
    @Context() context: { req: { user: { sub: string } } },
  ): Promise<UserSettings> {
    const userId = context.req.user.sub;
    this.logger.log(`Updating settings for user: ${userId}`);

    try {
      const settings = await this.userSettingsRepository.upsert(userId, {
        notificationPreferences: input.notificationPreferences,
        uiPreferences: input.uiPreferences,
        featurePreferences: input.featurePreferences,
        chartPreferences: input.chartPreferences as any,
      });

      return {
        userId: settings.userId,
        notificationPreferences: settings.notificationPreferences,
        uiPreferences: settings.uiPreferences,
        featurePreferences: settings.featurePreferences,
        chartPreferences: settings.chartPreferences as ChartPreferences,
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt,
      };
    } catch (error) {
      this.logger.error(`Failed to update user settings: ${error}`);
      throw error;
    }
  }

  @Mutation(() => ChartPreferences, {
    name: "updateChartPreferences",
    description: "Update chart preferences only",
  })
  async updateChartPreferences(
    @Args("input") input: ChartPreferencesInput,
    @Context() context: { req: { user: { sub: string } } },
  ): Promise<ChartPreferences> {
    const userId = context.req.user.sub;
    this.logger.log(`Updating chart preferences for user: ${userId}`);

    try {
      // Get existing settings to merge
      const existing = await this.userSettingsRepository.findByUserId(userId);
      const existingChartPrefs = (existing?.chartPreferences || {}) as any;

      // Deep merge chart preferences
      const mergedChartPrefs = {
        ...existingChartPrefs,
        ...(input.tooltip && {
          tooltip: { ...existingChartPrefs.tooltip, ...input.tooltip },
        }),
        ...(input.ibcs && {
          ibcs: { ...existingChartPrefs.ibcs, ...input.ibcs },
        }),
        ...(input.display && {
          display: { ...existingChartPrefs.display, ...input.display },
        }),
        ...(input.controlsMode !== undefined && {
          controlsMode: input.controlsMode,
        }),
        ...(input.chartOverrides && {
          chartOverrides: {
            ...existingChartPrefs.chartOverrides,
            ...input.chartOverrides,
          },
        }),
      };

      const settings = await this.userSettingsRepository.updateSection(
        userId,
        "chartPreferences",
        mergedChartPrefs,
      );

      return (settings?.chartPreferences as ChartPreferences) || mergedChartPrefs;
    } catch (error) {
      this.logger.error(`Failed to update chart preferences: ${error}`);
      throw error;
    }
  }

  @Mutation(() => Boolean, {
    name: "resetChartPreferences",
    description: "Reset chart preferences to defaults",
  })
  async resetChartPreferences(
    @Context() context: { req: { user: { sub: string } } },
  ): Promise<boolean> {
    const userId = context.req.user.sub;
    this.logger.log(`Resetting chart preferences for user: ${userId}`);

    try {
      await this.userSettingsRepository.updateSection(
        userId,
        "chartPreferences",
        null,
      );
      return true;
    } catch (error) {
      this.logger.error(`Failed to reset chart preferences: ${error}`);
      return false;
    }
  }

  @Mutation(() => Boolean, {
    name: "updateChartOverride",
    description: "Update settings for a specific chart",
  })
  async updateChartOverride(
    @Args("chartId") chartId: string,
    @Args("settings", { type: () => ChartPreferencesInput }) settings: ChartPreferencesInput,
    @Context() context: { req: { user: { sub: string } } },
  ): Promise<boolean> {
    const userId = context.req.user.sub;
    this.logger.log(`Updating chart override for user: ${userId}, chart: ${chartId}`);

    try {
      const existing = await this.userSettingsRepository.findByUserId(userId);
      const existingChartPrefs = (existing?.chartPreferences || {}) as any;

      const updatedChartPrefs = {
        ...existingChartPrefs,
        chartOverrides: {
          ...existingChartPrefs.chartOverrides,
          [chartId]: settings,
        },
      };

      await this.userSettingsRepository.updateSection(
        userId,
        "chartPreferences",
        updatedChartPrefs,
      );

      return true;
    } catch (error) {
      this.logger.error(`Failed to update chart override: ${error}`);
      return false;
    }
  }

  @Mutation(() => Boolean, {
    name: "removeChartOverride",
    description: "Remove settings override for a specific chart",
  })
  async removeChartOverride(
    @Args("chartId") chartId: string,
    @Context() context: { req: { user: { sub: string } } },
  ): Promise<boolean> {
    const userId = context.req.user.sub;
    this.logger.log(`Removing chart override for user: ${userId}, chart: ${chartId}`);

    try {
      const existing = await this.userSettingsRepository.findByUserId(userId);
      const existingChartPrefs = (existing?.chartPreferences || {}) as any;

      if (existingChartPrefs.chartOverrides?.[chartId]) {
        delete existingChartPrefs.chartOverrides[chartId];
        
        await this.userSettingsRepository.updateSection(
          userId,
          "chartPreferences",
          existingChartPrefs,
        );
      }

      return true;
    } catch (error) {
      this.logger.error(`Failed to remove chart override: ${error}`);
      return false;
    }
  }

  // =====================================================
  // BATCH SYNC MUTATIONS
  // =====================================================

  @Mutation(() => BatchSyncResult, {
    name: "batchSyncSettings",
    description: "Batch sync all user settings from client. Supports offline-first pattern with conflict detection.",
  })
  async batchSyncSettings(
    @Args("input") input: BatchSyncSettingsInput,
    @Context() context: { req: { user: { sub: string } } },
  ): Promise<BatchSyncResult> {
    const userId = context.req.user.sub;
    this.logger.log(`Batch sync settings for user: ${userId}`);

    try {
      const existing = await this.userSettingsRepository.findByUserId(userId);
      const serverTimestamp = new Date();
      const conflicts: string[] = [];

      // Check for conflicts using timestamps
      if (input.lastSyncTimestamp && existing?.updatedAt) {
        const lastSync = new Date(input.lastSyncTimestamp);
        if (existing.updatedAt > lastSync) {
          // Server has newer changes - detect conflicts at chart level
          const existingChartOverrides = (existing.chartPreferences as any)?.chartOverrides || {};
          const incomingChartSettings = input.chartSettings || [];
          
          for (const chartSetting of incomingChartSettings) {
            const serverChart = existingChartOverrides[chartSetting.chartId];
            if (serverChart?.updatedAt) {
              const serverChartTime = new Date(serverChart.updatedAt);
              const clientChartTime = chartSetting.config?.updatedAt 
                ? new Date(chartSetting.config.updatedAt) 
                : new Date(input.clientTimestamp);
              
              if (serverChartTime > clientChartTime) {
                conflicts.push(chartSetting.chartId);
              }
            }
          }
        }
      }

      // Build merged settings
      const existingChartPrefs = (existing?.chartPreferences || {}) as any;
      
      // Merge chart overrides with incoming chart settings
      const mergedChartOverrides = { ...existingChartPrefs.chartOverrides };
      
      if (input.chartSettings) {
        for (const chartSetting of input.chartSettings) {
          // Skip conflicting charts (keep server version)
          if (conflicts.includes(chartSetting.chartId)) {
            continue;
          }
          
          mergedChartOverrides[chartSetting.chartId] = {
            ...mergedChartOverrides[chartSetting.chartId],
            ...chartSetting.config,
            locked: chartSetting.locked ?? mergedChartOverrides[chartSetting.chartId]?.locked ?? false,
            lockedAt: chartSetting.lockedAt ?? mergedChartOverrides[chartSetting.chartId]?.lockedAt,
            updatedAt: serverTimestamp.toISOString(),
          };
        }
      }

      // Build final chart preferences
      const mergedChartPrefs = {
        ...existingChartPrefs,
        ...(input.chartPreferences?.tooltip && {
          tooltip: { ...existingChartPrefs.tooltip, ...input.chartPreferences.tooltip },
        }),
        ...(input.chartPreferences?.ibcs && {
          ibcs: { ...existingChartPrefs.ibcs, ...input.chartPreferences.ibcs },
        }),
        ...(input.chartPreferences?.display && {
          display: { ...existingChartPrefs.display, ...input.chartPreferences.display },
        }),
        ...(input.chartPreferences?.controlsMode !== undefined && {
          controlsMode: input.chartPreferences.controlsMode,
        }),
        chartOverrides: mergedChartOverrides,
      };

      // Upsert all settings
      const settings = await this.userSettingsRepository.upsert(userId, {
        notificationPreferences: input.notificationPreferences ?? existing?.notificationPreferences,
        uiPreferences: input.uiPreferences ?? existing?.uiPreferences,
        featurePreferences: input.featurePreferences ?? existing?.featurePreferences,
        chartPreferences: mergedChartPrefs,
      });

      this.logger.log(`Batch sync completed for user: ${userId}, conflicts: ${conflicts.length}`);

      return {
        success: true,
        serverTimestamp: serverTimestamp.toISOString(),
        conflicts: conflicts.length > 0 ? conflicts : undefined,
        settings: {
          userId: settings.userId,
          notificationPreferences: settings.notificationPreferences,
          uiPreferences: settings.uiPreferences,
          featurePreferences: settings.featurePreferences,
          chartPreferences: settings.chartPreferences as ChartPreferences,
          createdAt: settings.createdAt,
          updatedAt: settings.updatedAt,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to batch sync settings: ${error}`);
      return {
        success: false,
        serverTimestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // =====================================================
  // CHART LOCK/UNLOCK MUTATIONS
  // =====================================================

  @Mutation(() => ChartLockResult, {
    name: "lockChart",
    description: "Lock a chart to prevent modifications",
  })
  async lockChart(
    @Args("chartId") chartId: string,
    @Context() context: { req: { user: { sub: string } } },
  ): Promise<ChartLockResult> {
    const userId = context.req.user.sub;
    this.logger.log(`Locking chart for user: ${userId}, chart: ${chartId}`);

    try {
      const existing = await this.userSettingsRepository.findByUserId(userId);
      const existingChartPrefs = (existing?.chartPreferences || {}) as any;
      const lockedAt = new Date();

      const updatedChartPrefs = {
        ...existingChartPrefs,
        chartOverrides: {
          ...existingChartPrefs.chartOverrides,
          [chartId]: {
            ...existingChartPrefs.chartOverrides?.[chartId],
            locked: true,
            lockedAt: lockedAt.toISOString(),
            updatedAt: lockedAt.toISOString(),
          },
        },
      };

      await this.userSettingsRepository.updateSection(
        userId,
        "chartPreferences",
        updatedChartPrefs,
      );

      return {
        success: true,
        chartId,
        locked: true,
        lockedAt,
      };
    } catch (error) {
      this.logger.error(`Failed to lock chart: ${error}`);
      return {
        success: false,
        chartId,
        locked: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  @Mutation(() => ChartLockResult, {
    name: "unlockChart",
    description: "Unlock a chart to allow modifications",
  })
  async unlockChart(
    @Args("chartId") chartId: string,
    @Context() context: { req: { user: { sub: string } } },
  ): Promise<ChartLockResult> {
    const userId = context.req.user.sub;
    this.logger.log(`Unlocking chart for user: ${userId}, chart: ${chartId}`);

    try {
      const existing = await this.userSettingsRepository.findByUserId(userId);
      const existingChartPrefs = (existing?.chartPreferences || {}) as any;

      if (existingChartPrefs.chartOverrides?.[chartId]) {
        const updatedChartPrefs = {
          ...existingChartPrefs,
          chartOverrides: {
            ...existingChartPrefs.chartOverrides,
            [chartId]: {
              ...existingChartPrefs.chartOverrides[chartId],
              locked: false,
              lockedAt: null,
              updatedAt: new Date().toISOString(),
            },
          },
        };

        await this.userSettingsRepository.updateSection(
          userId,
          "chartPreferences",
          updatedChartPrefs,
        );
      }

      return {
        success: true,
        chartId,
        locked: false,
      };
    } catch (error) {
      this.logger.error(`Failed to unlock chart: ${error}`);
      return {
        success: false,
        chartId,
        locked: true,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  @Query(() => Boolean, {
    name: "isChartLocked",
    description: "Check if a chart is locked",
  })
  async isChartLocked(
    @Args("chartId") chartId: string,
    @Context() context: { req: { user: { sub: string } } },
  ): Promise<boolean> {
    const userId = context.req.user.sub;

    try {
      const existing = await this.userSettingsRepository.findByUserId(userId);
      const chartOverrides = (existing?.chartPreferences as any)?.chartOverrides;
      return chartOverrides?.[chartId]?.locked === true;
    } catch (error) {
      this.logger.error(`Failed to check chart lock status: ${error}`);
      return false;
    }
  }
}
