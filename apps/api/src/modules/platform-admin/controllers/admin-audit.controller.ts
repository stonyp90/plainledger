import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Unprotected } from 'nest-keycloak-connect';
import { PlatformAdminGuard } from '../guards/platform-admin.guard';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { AdminAuditService, AuditLogFilter } from '../services/admin-audit.service';

@ApiTags('Platform Admin - Audit')
@ApiBearerAuth()
@Controller('admin/audit')
@Unprotected()
@UseGuards(PlatformAdminGuard)
export class AdminAuditController {
  constructor(private readonly auditService: AdminAuditService) {}

  @Get()
  @RequirePermission('audit:view')
  @ApiOperation({ summary: 'Get audit logs' })
  @ApiQuery({ name: 'adminUserId', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'resourceType', required: false })
  @ApiQuery({ name: 'targetOrgId', required: false })
  @ApiQuery({ name: 'success', required: false, type: Boolean })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Audit logs' })
  async getLogs(
    @Query('adminUserId') adminUserId?: string,
    @Query('action') action?: string,
    @Query('resourceType') resourceType?: string,
    @Query('targetOrgId') targetOrgId?: string,
    @Query('success') success?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const filter: AuditLogFilter = {
      adminUserId,
      action,
      resourceType,
      targetOrgId,
      success: success === 'true' ? true : success === 'false' ? false : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      search,
      limit: limit ? Number(limit) : 100,
      offset: offset ? Number(offset) : 0,
    };

    return this.auditService.getLogs(filter);
  }

  @Get('actions')
  @RequirePermission('audit:view')
  @ApiOperation({ summary: 'Get distinct actions for filtering' })
  @ApiResponse({ status: 200, description: 'List of actions' })
  async getActions() {
    return this.auditService.getDistinctActions();
  }

  @Get('resource-types')
  @RequirePermission('audit:view')
  @ApiOperation({ summary: 'Get distinct resource types for filtering' })
  @ApiResponse({ status: 200, description: 'List of resource types' })
  async getResourceTypes() {
    return this.auditService.getDistinctResourceTypes();
  }
}
