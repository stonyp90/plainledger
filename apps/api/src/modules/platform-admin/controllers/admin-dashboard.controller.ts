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

@ApiTags('Platform Admin - Dashboard')
@ApiBearerAuth()
@Controller('admin/dashboard')
@UseGuards(PlatformAdminGuard)
export class AdminDashboardController {
  constructor(
    private readonly orgService: AdminOrgService,
    private readonly userService: AdminUserService,
    private readonly auditService: AdminAuditService,
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
    const [orgStats, userStats, recentAuditLogs] = await Promise.all([
      this.orgService.getOrgStats(),
      this.userService.getUserStats(),
      this.auditService.getRecentLogs(10),
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
        total24h: 0,
        completed: 0,
        failed: 0,
        running: 0,
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
    // Basic health check - could be expanded to check DB, Redis, etc.
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'healthy',
        cache: 'healthy',
        queue: 'healthy',
      },
    };
  }
}
