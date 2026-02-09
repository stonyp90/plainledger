import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { PlatformAdminGuard } from '../guards/platform-admin.guard';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { AdminOrgService, OrgListFilter } from '../services/admin-org.service';
import { AdminAuditService } from '../services/admin-audit.service';
import { 
  CreateOrganizationDto, 
  UpdateOrganizationDto, 
  OrganizationListResponseDto,
  OrganizationStatsDto,
} from '../dto';

@ApiTags('Platform Admin - Organizations')
@ApiBearerAuth()
@Controller('admin/organizations')
@UseGuards(PlatformAdminGuard)
export class AdminOrganizationsController {
  private readonly logger = new Logger(AdminOrganizationsController.name);

  constructor(
    private readonly orgService: AdminOrgService,
    private readonly auditService: AdminAuditService,
  ) {}

  @Get()
  @RequirePermission('org:list')
  @ApiOperation({ summary: 'List all organizations', description: 'Returns paginated list of all organizations. Requires org:list permission.' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name, tenant ID, or legal name' })
  @ApiQuery({ name: 'industry', required: false, description: 'Filter by industry' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of results (default 50)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Pagination offset' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort field (e.g., createdAt, name)' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'], description: 'Sort order' })
  @ApiResponse({ status: 200, description: 'List of organizations', type: OrganizationListResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async listOrganizations(
    @Query('search') search?: string,
    @Query('industry') industry?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    try {
      const filter: OrgListFilter = {
        search,
        industry,
        limit: limit ? Number(limit) : 50,
        offset: offset ? Number(offset) : 0,
        sortBy,
        sortOrder,
      };

      return await this.orgService.listOrganizations(filter);
    } catch (error) {
      this.logger.error(`Failed to list organizations: ${error.message}`, error.stack);
      return { organizations: [], total: 0 };
    }
  }

  @Get('stats')
  @RequirePermission('org:list')
  @ApiOperation({ summary: 'Get organization statistics', description: 'Returns aggregate statistics about organizations.' })
  @ApiResponse({ status: 200, description: 'Organization statistics', type: OrganizationStatsDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getStats() {
    try {
      return await this.orgService.getOrgStats();
    } catch (error) {
      this.logger.error(`Failed to get organization stats: ${error.message}`, error.stack);
      return {
        totalOrganizations: 0,
        activeOrganizations: 0,
        byPlan: {},
        byIndustry: {},
      };
    }
  }

  @Get('industries')
  @RequirePermission('org:list')
  @ApiOperation({ summary: 'Get distinct industries for filtering' })
  @ApiResponse({ status: 200, description: 'List of industries' })
  async getIndustries() {
    return this.orgService.getDistinctIndustries();
  }

  @Get(':id')
  @RequirePermission('org:view')
  @ApiOperation({ summary: 'Get organization by ID' })
  @ApiResponse({ status: 200, description: 'Organization details' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async getOrganization(@Param('id') id: string) {
    return this.orgService.getOrganization(id);
  }

  @Get(':id/users')
  @RequirePermission('org:view', 'user:list')
  @ApiOperation({ summary: 'Get users in organization' })
  @ApiResponse({ status: 200, description: 'List of users in organization' })
  async getOrganizationUsers(@Param('id') id: string) {
    return this.orgService.getOrganizationUsers(id);
  }

  @Get(':id/audit')
  @RequirePermission('org:view', 'audit:view')
  @ApiOperation({ summary: 'Get audit logs for organization' })
  @ApiResponse({ status: 200, description: 'Audit logs for organization' })
  async getOrganizationAudit(@Param('id') id: string) {
    return this.auditService.getLogsForOrganization(id);
  }

  @Post()
  @RequirePermission('org:create')
  @ApiOperation({ summary: 'Create organization on behalf of customer', description: 'Creates a new organization. Use this to onboard customers without them needing to self-register.' })
  @ApiResponse({ status: 201, description: 'Organization created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires org:create permission' })
  async createOrganization(@Body() dto: CreateOrganizationDto, @Req() req: any) {
    return this.auditService.logWithTiming(
      {
        adminUser: req.adminUser,
        action: 'org:create',
        resourceType: 'org',
        metadata: { dto },
      },
      async () => {
        const org = await this.orgService.createOrganization(dto);
        return org;
      },
    );
  }

  @Put(':id')
  @RequirePermission('org:edit')
  @ApiOperation({ summary: 'Update organization', description: 'Update organization settings and metadata.' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Organization updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires org:edit permission' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async updateOrganization(
    @Param('id') id: string,
    @Body() updates: UpdateOrganizationDto,
    @Req() req: any,
  ) {
    const beforeState = await this.orgService.getOrganization(id);

    return this.auditService.logWithTiming(
      {
        adminUser: req.adminUser,
        action: 'org:edit',
        resourceType: 'org',
        resourceId: id,
        resourceName: beforeState.name,
        targetOrgId: id,
        targetOrgName: beforeState.name,
        beforeState: beforeState as any,
        metadata: { updates },
      },
      async () => {
        const org = await this.orgService.updateOrganization(id, updates);
        return org;
      },
    );
  }

  @Delete(':id')
  @RequirePermission('org:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete organization' })
  @ApiResponse({ status: 204, description: 'Organization deleted' })
  async deleteOrganization(@Param('id') id: string, @Req() req: any) {
    const org = await this.orgService.getOrganization(id);

    return this.auditService.logWithTiming(
      {
        adminUser: req.adminUser,
        action: 'org:delete',
        resourceType: 'org',
        resourceId: id,
        resourceName: org.name,
        targetOrgId: id,
        targetOrgName: org.name,
        beforeState: org as any,
      },
      async () => {
        await this.orgService.deleteOrganization(id);
      },
    );
  }

  @Delete(':id/hard')
  @RequirePermission('org:hard_delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Permanently delete organization (GDPR)' })
  @ApiResponse({ status: 204, description: 'Organization permanently deleted' })
  async hardDeleteOrganization(@Param('id') id: string, @Req() req: any) {
    const org = await this.orgService.getOrganization(id);

    return this.auditService.logWithTiming(
      {
        adminUser: req.adminUser,
        action: 'org:hard_delete',
        resourceType: 'org',
        resourceId: id,
        resourceName: org.name,
        targetOrgId: id,
        targetOrgName: org.name,
        beforeState: org as any,
        metadata: { warning: 'PERMANENT DELETION - GDPR' },
      },
      async () => {
        await this.orgService.hardDeleteOrganization(id);
      },
    );
  }

  @Post(':id/restore')
  @RequirePermission('org:delete')
  @ApiOperation({ summary: 'Restore deleted organization' })
  @ApiResponse({ status: 200, description: 'Organization restored' })
  async restoreOrganization(@Param('id') id: string, @Req() req: any) {
    return this.auditService.logWithTiming(
      {
        adminUser: req.adminUser,
        action: 'org:restore',
        resourceType: 'org',
        resourceId: id,
      },
      async () => {
        return this.orgService.restoreOrganization(id);
      },
    );
  }
}
