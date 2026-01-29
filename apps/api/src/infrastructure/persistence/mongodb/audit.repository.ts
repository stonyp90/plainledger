/**
 * Audit Repository
 * Compliance-grade audit logging for all user actions
 *
 * Requirements:
 * - 7-year retention (SOC2/PIPEDA compliance)
 * - Tamper-evident (append-only)
 * - Fast queries by actor, resource, time range
 * - Support for data export (audit trails)
 *
 * Logged actions:
 * - Authentication (login, logout, password changes)
 * - Data access (viewed reports, exported data)
 * - Data modification (created, updated, deleted records)
 * - Admin actions (user management, settings changes)
 * - Integration actions (connected/disconnected data sources)
 */

import { Injectable, Logger } from '@nestjs/common';
import { MongoDBService, AuditLog } from './mongodb.module';

// ============================================================================
// Types
// ============================================================================

export type AuditAction =
  // Authentication
  | 'auth.login'
  | 'auth.logout'
  | 'auth.password_changed'
  | 'auth.mfa_enabled'
  | 'auth.mfa_disabled'
  | 'auth.api_key_created'
  | 'auth.api_key_revoked'
  // User management
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'user.invited'
  | 'user.role_changed'
  // Organization
  | 'organization.created'
  | 'organization.updated'
  | 'organization.deleted'
  | 'organization.member_added'
  | 'organization.member_removed'
  | 'organization.settings_updated'
  // Data sources
  | 'datasource.connected'
  | 'datasource.disconnected'
  | 'datasource.synced'
  | 'datasource.error'
  // Reports & dashboards
  | 'report.viewed'
  | 'report.exported'
  | 'report.shared'
  | 'dashboard.viewed'
  | 'dashboard.created'
  | 'dashboard.updated'
  | 'dashboard.deleted'
  // Financial data
  | 'financial_data.viewed'
  | 'financial_data.exported'
  | 'account.created'
  | 'account.updated'
  | 'account.deleted'
  // Documents
  | 'document.uploaded'
  | 'document.downloaded'
  | 'document.deleted'
  | 'document.shared'
  // Subscription
  | 'subscription.started'
  | 'subscription.upgraded'
  | 'subscription.downgraded'
  | 'subscription.cancelled'
  | 'payment.succeeded'
  | 'payment.failed'
  // AI/Intelligence
  | 'ai.query_executed'
  | 'ai.recommendation_viewed'
  | 'ai.recommendation_applied'
  // Admin
  | 'admin.user_impersonated'
  | 'admin.data_exported'
  | 'admin.settings_changed';

export type ResourceType =
  | 'user'
  | 'organization'
  | 'datasource'
  | 'report'
  | 'dashboard'
  | 'document'
  | 'account'
  | 'subscription'
  | 'payment'
  | 'ai_query'
  | 'settings';

export interface AuditInput {
  action: AuditAction | string;
  actorId: string;
  actorEmail?: string;
  actorRole?: string;
  organizationId?: string;
  resourceType: ResourceType;
  resourceId?: string;
  resourceName?: string;
  changes?: {
    field: string;
    oldValue?: unknown;
    newValue?: unknown;
  }[];
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  success?: boolean;
  errorMessage?: string;
}

export interface AuditQuery {
  actorId?: string;
  organizationId?: string;
  resourceType?: ResourceType;
  resourceId?: string;
  action?: AuditAction | string | string[];
  startDate?: Date;
  endDate?: Date;
  success?: boolean;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Audit Repository
// ============================================================================

@Injectable()
export class AuditRepository {
  private readonly logger = new Logger(AuditRepository.name);
  private fallbackLogs: AuditLog[] = [];
  private readonly MAX_FALLBACK_LOGS = 1000;

  constructor(private readonly mongoService: MongoDBService) {}

  // --------------------------------------------------------------------------
  // Logging
  // --------------------------------------------------------------------------

  /**
   * Log an audit event
   */
  async log(input: AuditInput): Promise<void> {
    const auditLog: AuditLog = {
      action: input.action,
      actorId: input.actorId,
      actorEmail: input.actorEmail,
      actorRole: input.actorRole,
      organizationId: input.organizationId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      resourceName: input.resourceName,
      changes: input.changes,
      metadata: input.metadata,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      success: input.success !== false,
      errorMessage: input.errorMessage,
      timestamp: new Date(),
    };

    try {
      const collection = await this.mongoService.getAuditCollection();
      if (collection) {
        await collection.insertOne(auditLog);
      } else {
        // Fallback to in-memory storage if MongoDB not available
        this.storeFallback(auditLog);
      }
    } catch (error) {
      this.logger.error(`Failed to write audit log: ${error.message}`);
      this.storeFallback(auditLog);
    }
  }

  /**
   * Store in fallback (in-memory) when MongoDB unavailable
   */
  private storeFallback(log: AuditLog): void {
    this.fallbackLogs.push(log);
    if (this.fallbackLogs.length > this.MAX_FALLBACK_LOGS) {
      this.fallbackLogs.shift(); // Remove oldest
    }
    this.logger.warn(
      'Audit log stored in fallback memory - MongoDB may be unavailable',
    );
  }

  // --------------------------------------------------------------------------
  // Convenience Methods
  // --------------------------------------------------------------------------

  /**
   * Log a successful action
   */
  async logSuccess(
    input: Omit<AuditInput, 'success' | 'errorMessage'>,
  ): Promise<void> {
    await this.log({ ...input, success: true });
  }

  /**
   * Log a failed action
   */
  async logFailure(
    input: Omit<AuditInput, 'success'> & { errorMessage: string },
  ): Promise<void> {
    await this.log({ ...input, success: false });
  }

  /**
   * Log authentication event
   */
  async logAuth(
    action: 'login' | 'logout' | 'password_changed',
    actorId: string,
    actorEmail: string,
    metadata?: {
      ipAddress?: string;
      userAgent?: string;
      method?: string;
      success?: boolean;
      errorMessage?: string;
    },
  ): Promise<void> {
    await this.log({
      action: `auth.${action}`,
      actorId,
      actorEmail,
      resourceType: 'user',
      resourceId: actorId,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      metadata: { method: metadata?.method },
      success: metadata?.success !== false,
      errorMessage: metadata?.errorMessage,
    });
  }

  /**
   * Log data view event
   */
  async logDataView(params: {
    actorId: string;
    actorEmail?: string;
    organizationId: string;
    resourceType: ResourceType;
    resourceId: string;
    resourceName?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    const action =
      params.resourceType === 'report'
        ? 'report.viewed'
        : params.resourceType === 'dashboard'
          ? 'dashboard.viewed'
          : 'financial_data.viewed';

    await this.log({
      action,
      actorId: params.actorId,
      actorEmail: params.actorEmail,
      organizationId: params.organizationId,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      resourceName: params.resourceName,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }

  /**
   * Log data export event
   */
  async logDataExport(params: {
    actorId: string;
    actorEmail?: string;
    organizationId: string;
    resourceType: ResourceType;
    resourceId?: string;
    resourceName?: string;
    format: string;
    recordCount?: number;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.log({
      action:
        params.resourceType === 'report'
          ? 'report.exported'
          : 'financial_data.exported',
      actorId: params.actorId,
      actorEmail: params.actorEmail,
      organizationId: params.organizationId,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      resourceName: params.resourceName,
      metadata: {
        format: params.format,
        recordCount: params.recordCount,
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }

  /**
   * Log data modification
   */
  async logModification(params: {
    action: 'created' | 'updated' | 'deleted';
    actorId: string;
    actorEmail?: string;
    organizationId?: string;
    resourceType: ResourceType;
    resourceId: string;
    resourceName?: string;
    changes?: { field: string; oldValue?: unknown; newValue?: unknown }[];
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    const actionMap = {
      created: `${params.resourceType}.created`,
      updated: `${params.resourceType}.updated`,
      deleted: `${params.resourceType}.deleted`,
    };

    await this.log({
      action: actionMap[params.action],
      actorId: params.actorId,
      actorEmail: params.actorEmail,
      organizationId: params.organizationId,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      resourceName: params.resourceName,
      changes: params.changes,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }

  // --------------------------------------------------------------------------
  // Query Methods
  // --------------------------------------------------------------------------

  /**
   * Query audit logs
   */
  async query(query: AuditQuery): Promise<AuditLog[]> {
    const collection = await this.mongoService.getAuditCollection();

    if (!collection) {
      // Return from fallback if MongoDB unavailable
      return this.queryFallback(query);
    }

    const filter: Record<string, unknown> = {};

    if (query.actorId) filter.actorId = query.actorId;
    if (query.organizationId) filter.organizationId = query.organizationId;
    if (query.resourceType) filter.resourceType = query.resourceType;
    if (query.resourceId) filter.resourceId = query.resourceId;
    if (query.success !== undefined) filter.success = query.success;

    if (query.action) {
      filter.action = Array.isArray(query.action)
        ? { $in: query.action }
        : query.action;
    }

    if (query.startDate || query.endDate) {
      filter.timestamp = {};
      if (query.startDate) {
        (filter.timestamp as Record<string, Date>).$gte = query.startDate;
      }
      if (query.endDate) {
        (filter.timestamp as Record<string, Date>).$lte = query.endDate;
      }
    }

    return collection
      .find(filter)
      .sort({ timestamp: -1 })
      .skip(query.offset || 0)
      .limit(query.limit || 100)
      .toArray();
  }

  /**
   * Query fallback logs
   */
  private queryFallback(query: AuditQuery): AuditLog[] {
    let logs = [...this.fallbackLogs];

    if (query.actorId) {
      logs = logs.filter((l) => l.actorId === query.actorId);
    }
    if (query.organizationId) {
      logs = logs.filter((l) => l.organizationId === query.organizationId);
    }
    if (query.resourceType) {
      logs = logs.filter((l) => l.resourceType === query.resourceType);
    }
    if (query.resourceId) {
      logs = logs.filter((l) => l.resourceId === query.resourceId);
    }
    if (query.success !== undefined) {
      logs = logs.filter((l) => l.success === query.success);
    }

    logs.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    const offset = query.offset || 0;
    const limit = query.limit || 100;

    return logs.slice(offset, offset + limit);
  }

  /**
   * Get user activity summary
   */
  async getUserActivity(params: {
    actorId: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    totalActions: number;
    actionCounts: { action: string; count: number }[];
    lastAction?: AuditLog;
  }> {
    const collection = await this.mongoService.getAuditCollection();
    if (!collection) {
      return { totalActions: 0, actionCounts: [] };
    }

    const match: Record<string, unknown> = { actorId: params.actorId };

    if (params.startDate || params.endDate) {
      match.timestamp = {};
      if (params.startDate) {
        (match.timestamp as Record<string, Date>).$gte = params.startDate;
      }
      if (params.endDate) {
        (match.timestamp as Record<string, Date>).$lte = params.endDate;
      }
    }

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
        },
      },
      { $project: { action: '$_id', count: 1, _id: 0 } },
      { $sort: { count: -1 as const } },
    ];

    const actionCounts = await collection
      .aggregate<{ action: string; count: number }>(pipeline)
      .toArray();

    const totalActions = actionCounts.reduce((sum, a) => sum + a.count, 0);

    const lastAction = await collection
      .find({ actorId: params.actorId })
      .sort({ timestamp: -1 })
      .limit(1)
      .toArray()
      .then((logs) => logs[0]);

    return { totalActions, actionCounts, lastAction };
  }

  /**
   * Export audit logs for compliance
   */
  async exportForCompliance(params: {
    organizationId: string;
    startDate: Date;
    endDate: Date;
    format?: 'json' | 'csv';
  }): Promise<AuditLog[]> {
    const collection = await this.mongoService.getAuditCollection();
    if (!collection) return [];

    return collection
      .find({
        organizationId: params.organizationId,
        timestamp: {
          $gte: params.startDate,
          $lte: params.endDate,
        },
      })
      .sort({ timestamp: 1 })
      .toArray();
  }

  // --------------------------------------------------------------------------
  // Health & Status
  // --------------------------------------------------------------------------

  /**
   * Get fallback log count (for monitoring)
   */
  getFallbackLogCount(): number {
    return this.fallbackLogs.length;
  }

  /**
   * Flush fallback logs to MongoDB
   */
  async flushFallbackLogs(): Promise<number> {
    if (this.fallbackLogs.length === 0) return 0;

    const collection = await this.mongoService.getAuditCollection();
    if (!collection) return 0;

    try {
      const logs = [...this.fallbackLogs];
      await collection.insertMany(logs, { ordered: false });
      this.fallbackLogs = [];
      this.logger.log(`Flushed ${logs.length} fallback audit logs to MongoDB`);
      return logs.length;
    } catch (error) {
      this.logger.error(`Failed to flush fallback logs: ${error.message}`);
      return 0;
    }
  }
}
