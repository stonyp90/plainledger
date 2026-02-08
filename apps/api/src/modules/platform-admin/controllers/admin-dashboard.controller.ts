import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PlatformAdminGuard } from '../guards/platform-admin.guard';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { AdminOrgService } from '../services/admin-org.service';
import { AdminUserService } from '../services/admin-user.service';
import { AdminAuditService } from '../services/admin-audit.service';
import { AdminHealthService } from '../services/admin-health.service';

@ApiTags('Platform Admin - Dashboard')
@ApiBearerAuth()
@Controller('admin/dashboard')
@UseGuards(PlatformAdminGuard)
export class AdminDashboardController {
  constructor(
    private readonly orgService: AdminOrgService,
    private readonly userService: AdminUserService,
    private readonly auditService: AdminAuditService,
    private readonly healthService: AdminHealthService,
  ) {}

  @Get('stats')
  @RequirePermission('org:list')
  @ApiOperation({ 
    summary: 'Get aggregated dashboard statistics', 
    description: 'Returns combined statistics for the admin dashboard including organizations, users, and activity.' 
  })
  @ApiResponse({ status: 200, description: 'Dashboard statistics' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getDashboardStats() {
    try {
      const [orgStats, userStats, recentAuditLogs, syncStats, overallHealth] = await Promise.allSettled([
        this.orgService.getOrgStats(),
        this.userService.getUserStats(),
        this.auditService.getRecentLogs(10),
        this.healthService.getSyncJobStats(),
        this.healthService.getOverallHealth(),
      ]);

      // Extract values with defaults for failed promises
      const orgData = orgStats.status === 'fulfilled' ? orgStats.value : { totalOrganizations: 0, byIndustry: {}, activeOrganizations: 0 };
      const userData = userStats.status === 'fulfilled' ? userStats.value : { totalUsers: 0, activeUsers: 0, activeToday: 0, newThisMonth: 0 };
      const auditData = recentAuditLogs.status === 'fulfilled' ? recentAuditLogs.value : [];
      const syncData = syncStats.status === 'fulfilled' ? syncStats.value : { total24h: 0, completed: 0, failed: 0, running: 0, byProvider: {} };
      const healthData = overallHealth.status === 'fulfilled' ? overallHealth.value : { status: 'unknown', degradedCount: 0, unhealthyCount: 0 };

      return {
        organizations: {
          total: orgData.totalOrganizations || 0,
          byIndustry: orgData.byIndustry || {},
          active: orgData.activeOrganizations || orgData.totalOrganizations || 0,
        },
        users: {
          total: userData.totalUsers || 0,
          active: userData.activeUsers || 0,
          activeToday: userData.activeToday || 0,
          newThisMonth: userData.newThisMonth || 0,
        },
        billing: {
          mrr: 0, // Would come from billing service
          arr: 0,
          activeSubscriptions: 0,
          churnRate: 0,
        },
        syncJobs: {
          total24h: syncData.total24h || 0,
          completed: syncData.completed || 0,
          failed: syncData.failed || 0,
          running: syncData.running || 0,
          byProvider: syncData.byProvider || {},
        },
        health: {
          overallStatus: healthData.status || 'unknown',
          degradedServices: healthData.degradedCount || 0,
          unhealthyServices: healthData.unhealthyCount || 0,
        },
        recentActivity: Array.isArray(auditData) ? auditData : [],
      };
    } catch (error) {
      // Return default stats on error
      return {
        organizations: { total: 0, byIndustry: {}, active: 0 },
        users: { total: 0, active: 0, activeToday: 0, newThisMonth: 0 },
        billing: { mrr: 0, arr: 0, activeSubscriptions: 0, churnRate: 0 },
        syncJobs: { total24h: 0, completed: 0, failed: 0, running: 0, byProvider: {} },
        health: { overallStatus: 'unknown', degradedServices: 0, unhealthyServices: 0 },
        recentActivity: [],
      };
    }
  }

  @Get('health')
  @RequirePermission('org:list')
  @ApiOperation({ 
    summary: 'Get system health status', 
    description: 'Returns health status of platform services.' 
  })
  @ApiResponse({ status: 200, description: 'System health status' })
  async getSystemHealth() {
    return this.healthService.getOverallHealth();
  }

  @Get('health/services')
  @RequirePermission('health:view')
  @ApiOperation({ 
    summary: 'Get per-service health status', 
    description: 'Returns detailed health status for each service (PostgreSQL, Redis, Keycloak, etc.)' 
  })
  @ApiResponse({ status: 200, description: 'Service health statuses' })
  async getServicesHealth() {
    return {
      services: await this.healthService.getServicesHealth(),
    };
  }

  @Get('health/metrics')
  @RequirePermission('health:view')
  @ApiOperation({ 
    summary: 'Get system metrics', 
    description: 'Returns system performance metrics (requests/min, error rates, etc.)' 
  })
  @ApiResponse({ status: 200, description: 'System metrics' })
  async getSystemMetrics() {
    return this.healthService.getSystemMetrics();
  }

  @Get('sync/stats')
  @RequirePermission('sync:view')
  @ApiOperation({ 
    summary: 'Get sync job statistics', 
    description: 'Returns ETL sync job statistics with success/failure rates' 
  })
  @ApiResponse({ status: 200, description: 'Sync job statistics' })
  async getSyncStats() {
    return this.healthService.getSyncJobStats();
  }
}
