import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like, In } from 'typeorm';
import { AdminAuditLogEntity } from '../entities/admin-audit-log.entity';
import { AdminUserEntity } from '../entities/admin-user.entity';

export interface AuditLogFilter {
  adminUserId?: string;
  action?: string;
  resourceType?: string;
  targetOrgId?: string;
  targetUserId?: string;
  success?: boolean;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface AuditLogEntry {
  adminUser: AdminUserEntity;
  action: string;
  resourceType: string;
  resourceId?: string;
  resourceName?: string;
  targetOrgId?: string;
  targetOrgName?: string;
  targetUserId?: string;
  targetUserEmail?: string;
  beforeState?: Record<string, any>;
  afterState?: Record<string, any>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  durationMs?: number;
  success?: boolean;
  errorMessage?: string;
}

@Injectable()
export class AdminAuditService {
  private readonly logger = new Logger(AdminAuditService.name);

  constructor(
    @InjectRepository(AdminAuditLogEntity)
    private readonly auditLogRepository: Repository<AdminAuditLogEntity>,
  ) {}

  /**
   * Log an admin action
   */
  async log(entry: AuditLogEntry): Promise<AdminAuditLogEntity> {
    const log = this.auditLogRepository.create({
      adminUserId: entry.adminUser.id,
      adminEmail: entry.adminUser.email,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      resourceName: entry.resourceName,
      targetOrgId: entry.targetOrgId,
      targetOrgName: entry.targetOrgName,
      targetUserId: entry.targetUserId,
      targetUserEmail: entry.targetUserEmail,
      beforeState: entry.beforeState,
      afterState: entry.afterState,
      metadata: entry.metadata,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      sessionId: entry.sessionId,
      durationMs: entry.durationMs,
      success: entry.success ?? true,
      errorMessage: entry.errorMessage,
    });

    return this.auditLogRepository.save(log);
  }

  /**
   * Log action with timing
   */
  async logWithTiming<T>(
    entry: Omit<AuditLogEntry, 'durationMs' | 'success' | 'errorMessage'>,
    action: () => Promise<T>,
  ): Promise<T> {
    const startTime = Date.now();
    let success = true;
    let errorMessage: string | undefined;

    try {
      const result = await action();
      return result;
    } catch (error) {
      success = false;
      errorMessage = error.message;
      throw error;
    } finally {
      const durationMs = Date.now() - startTime;
      await this.log({
        ...entry,
        durationMs,
        success,
        errorMessage,
      });
    }
  }

  /**
   * Get audit logs with filters
   */
  async getLogs(filter: AuditLogFilter): Promise<{ logs: AdminAuditLogEntity[]; total: number }> {
    const queryBuilder = this.auditLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.adminUser', 'adminUser')
      .orderBy('log.createdAt', 'DESC');

    if (filter.adminUserId) {
      queryBuilder.andWhere('log.adminUserId = :adminUserId', { adminUserId: filter.adminUserId });
    }

    if (filter.action) {
      queryBuilder.andWhere('log.action = :action', { action: filter.action });
    }

    if (filter.resourceType) {
      queryBuilder.andWhere('log.resourceType = :resourceType', { resourceType: filter.resourceType });
    }

    if (filter.targetOrgId) {
      queryBuilder.andWhere('log.targetOrgId = :targetOrgId', { targetOrgId: filter.targetOrgId });
    }

    if (filter.targetUserId) {
      queryBuilder.andWhere('log.targetUserId = :targetUserId', { targetUserId: filter.targetUserId });
    }

    if (filter.success !== undefined) {
      queryBuilder.andWhere('log.success = :success', { success: filter.success });
    }

    if (filter.startDate) {
      queryBuilder.andWhere('log.createdAt >= :startDate', { startDate: filter.startDate });
    }

    if (filter.endDate) {
      queryBuilder.andWhere('log.createdAt <= :endDate', { endDate: filter.endDate });
    }

    if (filter.search) {
      queryBuilder.andWhere(
        '(log.adminEmail ILIKE :search OR log.resourceName ILIKE :search OR log.targetOrgName ILIKE :search OR log.targetUserEmail ILIKE :search)',
        { search: `%${filter.search}%` },
      );
    }

    const total = await queryBuilder.getCount();

    if (filter.limit) {
      queryBuilder.limit(filter.limit);
    }

    if (filter.offset) {
      queryBuilder.offset(filter.offset);
    }

    const logs = await queryBuilder.getMany();

    return { logs, total };
  }

  /**
   * Get distinct actions for filtering
   */
  async getDistinctActions(): Promise<string[]> {
    const result = await this.auditLogRepository
      .createQueryBuilder('log')
      .select('DISTINCT log.action', 'action')
      .orderBy('log.action', 'ASC')
      .getRawMany();

    return result.map(r => r.action);
  }

  /**
   * Get distinct resource types for filtering
   */
  async getDistinctResourceTypes(): Promise<string[]> {
    const result = await this.auditLogRepository
      .createQueryBuilder('log')
      .select('DISTINCT log.resourceType', 'resourceType')
      .orderBy('log.resourceType', 'ASC')
      .getRawMany();

    return result.map(r => r.resourceType);
  }

  /**
   * Get audit logs for a specific organization
   */
  async getLogsForOrganization(orgId: string, limit = 100): Promise<AdminAuditLogEntity[]> {
    return this.auditLogRepository.find({
      where: { targetOrgId: orgId },
      relations: ['adminUser'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get audit logs for a specific user
   */
  async getLogsForUser(userId: string, limit = 100): Promise<AdminAuditLogEntity[]> {
    return this.auditLogRepository.find({
      where: { targetUserId: userId },
      relations: ['adminUser'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get recent activity for an admin user
   */
  async getAdminActivity(adminUserId: string, limit = 50): Promise<AdminAuditLogEntity[]> {
    return this.auditLogRepository.find({
      where: { adminUserId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
