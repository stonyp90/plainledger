import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { HealthCheckService } from '@infrastructure/health/health-check.service';
import { IDatalakeDataService } from '@application/ports/outbound/IDatalakeDataService';
import { DataSourceConnectionEntity } from '@infrastructure/persistence/postgres/entities/data-source-connection.entity';

@Injectable()
export class AdminHealthService {
  private readonly logger = new Logger(AdminHealthService.name);

  constructor(
    private readonly healthCheckService: HealthCheckService,
    @InjectRepository(DataSourceConnectionEntity)
    private readonly dataSourceConnectionRepo: Repository<DataSourceConnectionEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Optional()
    @Inject('IDatalakeDataService')
    private readonly datalakeService?: IDatalakeDataService,
  ) {}

  /**
   * Get all service health statuses
   */
  async getServicesHealth() {
    return this.healthCheckService.checkAllServices();
  }

  /**
   * Get overall system health
   */
  async getOverallHealth() {
    return this.healthCheckService.getOverallHealth();
  }

  /**
   * Get ETL sync job statistics from DataSourceConnection records.
   * Counts connections by last_sync_status for the last 24 hours and groups by provider.
   */
  async getSyncJobStats() {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Count connections that synced in the last 24 hours, grouped by last_sync_status
      const statusCounts = await this.dataSourceConnectionRepo
        .createQueryBuilder('conn')
        .select('conn.last_sync_status', 'syncStatus')
        .addSelect('COUNT(*)::int', 'count')
        .where('conn.last_sync_at >= :since', { since: twentyFourHoursAgo })
        .groupBy('conn.last_sync_status')
        .getRawMany<{ syncStatus: string | null; count: number }>();

      let completed = 0;
      let failed = 0;
      let running = 0;

      for (const row of statusCounts) {
        const count = Number(row.count);
        switch (row.syncStatus) {
          case 'success':
            completed += count;
            break;
          case 'failed':
            failed += count;
            break;
          case 'partial':
            // Partial syncs are still in-progress or partially done; count as running
            running += count;
            break;
        }
      }

      const total24h = completed + failed + running;

      // Group by provider for the last 24 hours
      const providerCounts = await this.dataSourceConnectionRepo
        .createQueryBuilder('conn')
        .select('conn.provider', 'provider')
        .addSelect('COUNT(*)::int', 'count')
        .where('conn.last_sync_at >= :since', { since: twentyFourHoursAgo })
        .groupBy('conn.provider')
        .getRawMany<{ provider: string; count: number }>();

      const byProvider: Record<string, number> = {};
      for (const row of providerCounts) {
        byProvider[row.provider] = Number(row.count);
      }

      return {
        total24h,
        completed,
        failed,
        running,
        byProvider,
      };
    } catch (error) {
      this.logger.error(`Failed to get sync job stats: ${error.message}`, error.stack);
      return {
        total24h: 0,
        completed: 0,
        failed: 0,
        running: 0,
        byProvider: {} as Record<string, number>,
      };
    }
  }

  /**
   * Get system metrics using Node.js runtime data and TypeORM connection pool.
   */
  async getSystemMetrics() {
    try {
      // Memory usage from Node.js process
      const memUsage = process.memoryUsage();

      // Uptime
      const uptimeSeconds = process.uptime();

      // Active DB connections from TypeORM's underlying driver pool
      const pool = (this.dataSource.driver as any).pool;
      const activeConnections = pool?.totalCount ?? 0;
      const idleConnections = pool?.idleCount ?? 0;
      const waitingRequests = pool?.waitingCount ?? 0;

      // TODO: requestsPerMinute and errorRate require HTTP middleware tracking
      // (e.g., a NestJS interceptor that increments counters per request/error).
      // Returning 0 until request-level metrics middleware is implemented.
      const requestsPerMinute = 0;
      const errorRate = 0;

      // TODO: averageResponseTime requires an interceptor that tracks response
      // durations. Returning 0 until that middleware is in place.
      const averageResponseTime = 0;

      return {
        requestsPerMinute,
        errorRate,
        averageResponseTime,
        activeConnections,
        memory: {
          heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
          heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
          rssMB: Math.round(memUsage.rss / 1024 / 1024),
          externalMB: Math.round(memUsage.external / 1024 / 1024),
        },
        uptime: {
          seconds: Math.round(uptimeSeconds),
          formatted: this.formatUptime(uptimeSeconds),
        },
        dbPool: {
          total: activeConnections,
          idle: idleConnections,
          waiting: waitingRequests,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get system metrics: ${error.message}`, error.stack);
      return {
        requestsPerMinute: 0,
        errorRate: 0,
        averageResponseTime: 0,
        activeConnections: 0,
      };
    }
  }

  /**
   * Format uptime seconds into a human-readable string.
   */
  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    parts.push(`${minutes}m`);
    return parts.join(' ');
  }
}
