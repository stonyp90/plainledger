/**
 * Sync Admin Controller
 *
 * Allows PlainLedger super admins (CPA admins) to configure sync schedules
 * for any integration type (QuickBooks, Xero, Sage, FreshBooks, etc.)
 */
import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Logger,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { Roles } from "nest-keycloak-connect";
import { CPAAdminGuard } from "../guards/cpa-admin.guard";

// =============================================================================
// DTOs
// =============================================================================

class SyncScheduleConfigDto {
  autoSyncEnabled: boolean;
  syncFrequency:
    | "hourly"
    | "every_6_hours"
    | "every_12_hours"
    | "daily"
    | "weekly"
    | "manual";
  syncTimeUtc: string; // HH:MM format
  syncDayOfWeek?: number; // 0-6 for weekly syncs
  syncToDatalake: boolean;
  syncEntities: string[];
  syncDateRangeDays: number;
}

class ConnectionSyncStatusDto {
  id: string;
  organizationId: string;
  organizationName: string;
  providerId: string;
  providerName: string;
  connectionName: string;
  companyName: string;
  status: string;
  autoSyncEnabled: boolean;
  syncFrequency: string;
  syncTimeUtc: string;
  nextScheduledSyncAt: string | null;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastError: string | null;
  syncEntities: string[];
  accountsCount: number;
  contactsCount: number;
  transactionsCount: number;
  configuredBy: string | null;
  configuredAt: string | null;
}

class SyncResultDto {
  connectionId: string;
  syncType: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  accountsFetched: number;
  contactsFetched: number;
  transactionsFetched: number;
  recordsCreated: number;
  recordsUpdated: number;
  qualityIssuesCount: number;
  errorMessage: string | null;
}

// =============================================================================
// Mock Data (In production, query from database)
// =============================================================================

const mockConnections: ConnectionSyncStatusDto[] = [
  {
    id: "conn-qbo-demo-1",
    organizationId: "org-demo-1",
    organizationName: "Demo Corp",
    providerId: "quickbooks",
    providerName: "QuickBooks Online",
    connectionName: "Demo QuickBooks Connection",
    companyName: "Demo Corp",
    status: "connected",
    autoSyncEnabled: true,
    syncFrequency: "daily",
    syncTimeUtc: "09:00",
    nextScheduledSyncAt: new Date(
      Date.now() + 12 * 60 * 60 * 1000,
    ).toISOString(),
    lastSyncAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    lastSyncStatus: "completed",
    lastError: null,
    syncEntities: [
      "accounts",
      "customers",
      "vendors",
      "invoices",
      "journal_entries",
    ],
    accountsCount: 24,
    contactsCount: 15,
    transactionsCount: 156,
    configuredBy: "admin@plainledger.com",
    configuredAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "conn-xero-acme-1",
    organizationId: "org-acme-1",
    organizationName: "Acme Industries",
    providerId: "xero",
    providerName: "Xero",
    connectionName: "Acme Xero Connection",
    companyName: "Acme Industries Ltd",
    status: "connected",
    autoSyncEnabled: false,
    syncFrequency: "manual",
    syncTimeUtc: "09:00",
    nextScheduledSyncAt: null,
    lastSyncAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    lastSyncStatus: "completed",
    lastError: null,
    syncEntities: ["accounts", "contacts", "invoices"],
    accountsCount: 45,
    contactsCount: 120,
    transactionsCount: 890,
    configuredBy: null,
    configuredAt: null,
  },
];

// =============================================================================
// Controller
// =============================================================================

@ApiTags("Sync Admin")
@ApiBearerAuth()
@Controller("api/admin/sync")
@UseGuards(CPAAdminGuard)
@Roles({ roles: ["plainledger_cpa_admin"] })
export class SyncAdminController {
  private readonly logger = new Logger(SyncAdminController.name);

  // ===========================================================================
  // List All Connections with Sync Status
  // ===========================================================================

  @Get("connections")
  @ApiOperation({ summary: "List all datasource connections with sync status" })
  @ApiResponse({
    status: 200,
    description: "List of connections with sync status",
  })
  async listConnections(
    @Query("provider") provider?: string,
    @Query("status") status?: string,
    @Query("autoSyncEnabled") autoSyncEnabled?: string,
  ): Promise<ConnectionSyncStatusDto[]> {
    this.logger.log(
      `Admin listing connections - provider: ${provider}, status: ${status}`,
    );

    let connections = [...mockConnections];

    // Apply filters
    if (provider) {
      connections = connections.filter((c) => c.providerId === provider);
    }
    if (status) {
      connections = connections.filter((c) => c.status === status);
    }
    if (autoSyncEnabled !== undefined) {
      const enabled = autoSyncEnabled === "true";
      connections = connections.filter((c) => c.autoSyncEnabled === enabled);
    }

    return connections;
  }

  // ===========================================================================
  // Get Single Connection Details
  // ===========================================================================

  @Get("connections/:id")
  @ApiOperation({ summary: "Get detailed sync status for a connection" })
  @ApiResponse({ status: 200, description: "Connection sync details" })
  async getConnection(
    @Param("id") id: string,
  ): Promise<ConnectionSyncStatusDto> {
    this.logger.log(`Admin getting connection details: ${id}`);

    const connection = mockConnections.find((c) => c.id === id);
    if (!connection) {
      throw new Error(`Connection not found: ${id}`);
    }

    return connection;
  }

  // ===========================================================================
  // Update Sync Schedule for a Connection
  // ===========================================================================

  @Patch("connections/:id/schedule")
  @ApiOperation({ summary: "Update sync schedule for a connection" })
  @ApiResponse({ status: 200, description: "Sync schedule updated" })
  async updateSyncSchedule(
    @Param("id") id: string,
    @Body() config: SyncScheduleConfigDto,
  ): Promise<ConnectionSyncStatusDto> {
    this.logger.log(`Admin updating sync schedule for connection: ${id}`);
    this.logger.log(`New config: ${JSON.stringify(config)}`);

    const connection = mockConnections.find((c) => c.id === id);
    if (!connection) {
      throw new Error(`Connection not found: ${id}`);
    }

    // Update the connection config
    connection.autoSyncEnabled = config.autoSyncEnabled;
    connection.syncFrequency = config.syncFrequency;
    connection.syncTimeUtc = config.syncTimeUtc;
    connection.syncEntities = config.syncEntities;
    connection.configuredBy = "admin@plainledger.com"; // Would come from JWT
    connection.configuredAt = new Date().toISOString();

    // Calculate next scheduled sync
    if (config.autoSyncEnabled && config.syncFrequency !== "manual") {
      connection.nextScheduledSyncAt = this.calculateNextSync(
        config.syncFrequency,
        config.syncTimeUtc,
        config.syncDayOfWeek,
      );
    } else {
      connection.nextScheduledSyncAt = null;
    }

    this.logger.log(
      `Updated connection ${id} - next sync: ${connection.nextScheduledSyncAt}`,
    );

    return connection;
  }

  // ===========================================================================
  // Enable/Disable Auto Sync (Quick Toggle)
  // ===========================================================================

  @Post("connections/:id/toggle-auto-sync")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Toggle auto-sync for a connection" })
  @ApiResponse({ status: 200, description: "Auto-sync toggled" })
  async toggleAutoSync(
    @Param("id") id: string,
  ): Promise<{ enabled: boolean; nextSyncAt: string | null }> {
    this.logger.log(`Admin toggling auto-sync for connection: ${id}`);

    const connection = mockConnections.find((c) => c.id === id);
    if (!connection) {
      throw new Error(`Connection not found: ${id}`);
    }

    connection.autoSyncEnabled = !connection.autoSyncEnabled;
    connection.configuredBy = "admin@plainledger.com";
    connection.configuredAt = new Date().toISOString();

    if (connection.autoSyncEnabled) {
      connection.nextScheduledSyncAt = this.calculateNextSync(
        connection.syncFrequency as any,
        connection.syncTimeUtc,
      );
    } else {
      connection.nextScheduledSyncAt = null;
    }

    return {
      enabled: connection.autoSyncEnabled,
      nextSyncAt: connection.nextScheduledSyncAt,
    };
  }

  // ===========================================================================
  // Trigger Manual Sync
  // ===========================================================================

  @Post("connections/:id/sync-now")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Trigger immediate sync for a connection" })
  @ApiResponse({ status: 202, description: "Sync initiated" })
  async triggerSync(
    @Param("id") id: string,
    @Body() options?: { fullSync?: boolean; entities?: string[] },
  ): Promise<{ message: string; syncId: string; estimatedDuration: string }> {
    this.logger.log(`Admin triggering sync for connection: ${id}`);

    const connection = mockConnections.find((c) => c.id === id);
    if (!connection) {
      throw new Error(`Connection not found: ${id}`);
    }

    // In production, this would:
    // 1. Queue a sync job
    // 2. Call the provider's API
    // 3. Store data in Bronze layer
    // 4. Trigger ETL pipeline to Silver/Gold

    const syncId = `sync-${Date.now()}`;

    return {
      message: `Sync initiated for ${connection.providerName} - ${connection.companyName}`,
      syncId,
      estimatedDuration: "2-5 minutes",
    };
  }

  // ===========================================================================
  // Get Sync History for a Connection
  // ===========================================================================

  @Get("connections/:id/history")
  @ApiOperation({ summary: "Get sync history for a connection" })
  @ApiResponse({ status: 200, description: "Sync history" })
  async getSyncHistory(
    @Param("id") id: string,
    @Query("limit") limit = 10,
  ): Promise<SyncResultDto[]> {
    this.logger.log(`Admin getting sync history for connection: ${id}`);

    // Mock sync history
    return [
      {
        connectionId: id,
        syncType: "scheduled",
        status: "completed",
        startedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        completedAt: new Date(
          Date.now() - 12 * 60 * 60 * 1000 + 45000,
        ).toISOString(),
        accountsFetched: 24,
        contactsFetched: 15,
        transactionsFetched: 12,
        recordsCreated: 51,
        recordsUpdated: 0,
        qualityIssuesCount: 0,
        errorMessage: null,
      },
      {
        connectionId: id,
        syncType: "manual",
        status: "completed",
        startedAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
        completedAt: new Date(
          Date.now() - 36 * 60 * 60 * 1000 + 120000,
        ).toISOString(),
        accountsFetched: 24,
        contactsFetched: 15,
        transactionsFetched: 156,
        recordsCreated: 195,
        recordsUpdated: 0,
        qualityIssuesCount: 2,
        errorMessage: null,
      },
    ];
  }

  // ===========================================================================
  // Bulk Update Sync Schedules
  // ===========================================================================

  @Post("bulk-update")
  @ApiOperation({
    summary: "Bulk update sync schedules for multiple connections",
  })
  @ApiResponse({ status: 200, description: "Bulk update completed" })
  async bulkUpdateSchedules(
    @Body()
    updates: {
      connectionIds: string[];
      config: Partial<SyncScheduleConfigDto>;
    },
  ): Promise<{ updated: number; failed: string[] }> {
    this.logger.log(
      `Admin bulk updating ${updates.connectionIds.length} connections`,
    );

    const failed: string[] = [];
    let updated = 0;

    for (const connId of updates.connectionIds) {
      const connection = mockConnections.find((c) => c.id === connId);
      if (!connection) {
        failed.push(connId);
        continue;
      }

      if (updates.config.autoSyncEnabled !== undefined) {
        connection.autoSyncEnabled = updates.config.autoSyncEnabled;
      }
      if (updates.config.syncFrequency) {
        connection.syncFrequency = updates.config.syncFrequency;
      }
      if (updates.config.syncTimeUtc) {
        connection.syncTimeUtc = updates.config.syncTimeUtc;
      }

      connection.configuredAt = new Date().toISOString();
      updated++;
    }

    return { updated, failed };
  }

  // ===========================================================================
  // Get Sync Statistics Summary
  // ===========================================================================

  @Get("stats")
  @ApiOperation({ summary: "Get overall sync statistics" })
  @ApiResponse({ status: 200, description: "Sync statistics" })
  async getSyncStats(): Promise<{
    totalConnections: number;
    byProvider: Record<string, number>;
    autoSyncEnabled: number;
    syncedLast24h: number;
    errorCount: number;
  }> {
    const byProvider: Record<string, number> = {};
    for (const conn of mockConnections) {
      byProvider[conn.providerId] = (byProvider[conn.providerId] || 0) + 1;
    }

    return {
      totalConnections: mockConnections.length,
      byProvider,
      autoSyncEnabled: mockConnections.filter((c) => c.autoSyncEnabled).length,
      syncedLast24h: mockConnections.filter((c) => {
        if (!c.lastSyncAt) return false;
        const syncTime = new Date(c.lastSyncAt).getTime();
        return Date.now() - syncTime < 24 * 60 * 60 * 1000;
      }).length,
      errorCount: mockConnections.filter((c) => c.status === "error").length,
    };
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  private calculateNextSync(
    frequency:
      | "hourly"
      | "every_6_hours"
      | "every_12_hours"
      | "daily"
      | "weekly"
      | "manual",
    timeUtc: string,
    dayOfWeek?: number,
  ): string {
    const now = new Date();
    const [hours, minutes] = timeUtc.split(":").map(Number);

    let nextSync = new Date(now);
    nextSync.setUTCHours(hours, minutes, 0, 0);

    switch (frequency) {
      case "hourly":
        nextSync = new Date(now.getTime() + 60 * 60 * 1000);
        break;
      case "every_6_hours":
        nextSync = new Date(now.getTime() + 6 * 60 * 60 * 1000);
        break;
      case "every_12_hours":
        nextSync = new Date(now.getTime() + 12 * 60 * 60 * 1000);
        break;
      case "daily":
        if (nextSync <= now) {
          nextSync.setUTCDate(nextSync.getUTCDate() + 1);
        }
        break;
      case "weekly":
        while (nextSync <= now || nextSync.getUTCDay() !== (dayOfWeek ?? 1)) {
          nextSync.setUTCDate(nextSync.getUTCDate() + 1);
        }
        break;
      default:
        return now.toISOString();
    }

    return nextSync.toISOString();
  }
}
