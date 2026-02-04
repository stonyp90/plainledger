import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { HealthCheckService } from '@infrastructure/health/health-check.service';
import { IDatalakeDataService } from '@application/ports/outbound/IDatalakeDataService';

@Injectable()
export class AdminHealthService {
  private readonly logger = new Logger(AdminHealthService.name);

  constructor(
    private readonly healthCheckService: HealthCheckService,
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
   * Get ETL sync job statistics
   * Note: In production, this would query from a sync jobs table or monitoring service
   */
  async getSyncJobStats() {
    // Placeholder implementation - would query actual sync job records
    // For now, return mock data structure
    return {
      total24h: 0,
      completed: 0,
      failed: 0,
      running: 0,
      byProvider: {} as Record<string, number>,
    };
  }

  /**
   * Get system metrics (simplified - in production would use monitoring service)
   */
  async getSystemMetrics() {
    // Placeholder - in production would integrate with monitoring service
    return {
      requestsPerMinute: 0,
      errorRate: 0,
      averageResponseTime: 0,
      activeConnections: 0,
    };
  }
}
