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
    const [orgStats, userStats, recentAuditLogs, syncStats, overallHealth] = await Promise.all([
      this.orgService.getOrgStats(),
      this.userService.getUserStats(),
      this.auditService.getRecentLogs(10),
      this.healthService.getSyncJobStats(),
      this.healthService.getOverallHealth(),
    ]);

    return {
      organizations: {
        total: orgStats.totalOrganizations,
        byIndustry: orgStats.byIndustry,
        active: orgStats.activeOrganizations || orgStats.totalOrganizations,
      },
      users: {
        total: userStats.totalUsers,
        active: userStats.activeUsers,
        activeToday: userStats.activeToday,
        newThisMonth: userStats.newThisMonth || 0,
      },
      billing: {
        mrr: 0, // Would come from billing service
        arr: 0,
        activeSubscriptions: 0,
        churnRate: 0,
      },
      syncJobs: {
        total24h: syncStats.total24h,
        completed: syncStats.completed,
        failed: syncStats.failed,
        running: syncStats.running,
        byProvider: syncStats.byProvider,
      },
      health: {
        overallStatus: overallHealth.status,
        degradedServices: overallHealth.degradedCount,
        unhealthyServices: overallHealth.unhealthyCount,
      },
      recentActivity: recentAuditLogs,
    };
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
