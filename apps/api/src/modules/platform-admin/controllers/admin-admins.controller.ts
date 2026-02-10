import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { PlatformAdminGuard } from '../guards/platform-admin.guard';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { AdminAuthService } from '../services/admin-auth.service';
import { AdminAuditService } from '../services/admin-audit.service';
import { 
  CreateAdminUserDto, 
  AssignGroupsDto, 
  AdminUserResponseDto,
  PermissionDto,
  GroupDto,
} from '../dto';

@ApiTags('Platform Admin - Admin Management')
@ApiBearerAuth()
@Controller('admin/admins')
@UseGuards(PlatformAdminGuard)
export class AdminAdminsController {
  constructor(
    private readonly authService: AdminAuthService,
    private readonly auditService: AdminAuditService,
  ) {}

  @Get()
  @RequirePermission('admin:list')
  @ApiOperation({ summary: 'List all admin users', description: 'Returns all platform admin users with their groups.' })
  @ApiResponse({ status: 200, description: 'List of admin users' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async listAdmins() {
    return this.authService.getAllAdmins();
  }

  @Get('permissions')
  @RequirePermission('admin:list')
  @ApiOperation({ summary: 'Get all available permissions', description: 'Returns all platform permissions grouped by category.' })
  @ApiResponse({ status: 200, description: 'Permissions grouped by category (org, user, billing, etc.)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getPermissions() {
    return this.authService.getAllPermissions();
  }

  @Get('groups')
  @RequirePermission('group:list')
  @ApiOperation({ summary: 'Get all groups with permissions', description: 'Returns all admin groups with their assigned permissions.' })
  @ApiResponse({ status: 200, description: 'List of groups with permissions', type: [GroupDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getGroups() {
    return this.authService.getAllGroups();
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current admin user with permissions', description: 'Returns the authenticated admin user with their effective permissions and groups.' })
  @ApiResponse({ status: 200, description: 'Current admin user with permissions', type: AdminUserResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMe(@Req() req: any) {
    const adminData = await this.authService.getAdminWithPermissions(req.user.sub);
    
    // If admin user doesn't exist, return basic info from token
    if (!adminData) {
      return {
        user: {
          id: req.user.sub,
          email: req.user.email || req.user.preferred_username,
          displayName: req.user.name || req.user.preferred_username || 'Admin User',
          keycloakId: req.user.sub,
          isActive: true,
        },
        permissions: [],
        groups: [],
        maxTierLevel: 0,
      };
    }
    
    return adminData;
  }

  @Post()
  @RequirePermission('admin:create')
  @ApiOperation({ summary: 'Create new admin user', description: 'Invites a new platform admin user. Requires admin:create permission.' })
  @ApiResponse({ status: 201, description: 'Admin created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires admin:create permission' })
  async createAdmin(
    @Body() body: CreateAdminUserDto,
    @Req() req: any,
  ) {
    return this.auditService.logWithTiming(
      {
        adminUser: req.adminUser,
        action: 'admin:create',
        resourceType: 'admin',
        metadata: { email: body.email, groups: body.groupIds },
      },
      async () => {
        return this.authService.createAdminUser(
          body.keycloakId,
          body.email,
          body.displayName,
          body.groupIds,
          req.adminUser.id,
        );
      },
    );
  }

  @Put(':id/groups')
  @RequirePermission('group:assign')
  @ApiOperation({ summary: 'Assign admin to groups', description: 'Replace the groups assigned to an admin user.' })
  @ApiParam({ name: 'id', description: 'Admin user ID' })
  @ApiResponse({ status: 200, description: 'Groups assigned successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires group:assign permission' })
  @ApiResponse({ status: 404, description: 'Admin user not found' })
  async assignGroups(
    @Param('id') id: string,
    @Body() body: AssignGroupsDto,
    @Req() req: any,
  ) {
    return this.auditService.logWithTiming(
      {
        adminUser: req.adminUser,
        action: 'admin:assign_groups',
        resourceType: 'admin',
        resourceId: id,
        metadata: { groupIds: body.groupIds },
      },
      async () => {
        await this.authService.assignUserToGroups(id, body.groupIds);
        return { success: true };
      },
    );
  }

  @Post(':id/disable')
  @RequirePermission('admin:disable')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disable admin account' })
  @ApiResponse({ status: 204, description: 'Admin disabled' })
  async disableAdmin(@Param('id') id: string, @Req() req: any) {
    return this.auditService.logWithTiming(
      {
        adminUser: req.adminUser,
        action: 'admin:disable',
        resourceType: 'admin',
        resourceId: id,
      },
      async () => {
        await this.authService.disableAdminUser(id);
      },
    );
  }

  @Post(':id/enable')
  @RequirePermission('admin:disable')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Enable admin account' })
  @ApiResponse({ status: 204, description: 'Admin enabled' })
  async enableAdmin(@Param('id') id: string, @Req() req: any) {
    return this.auditService.logWithTiming(
      {
        adminUser: req.adminUser,
        action: 'admin:enable',
        resourceType: 'admin',
        resourceId: id,
      },
      async () => {
        await this.authService.enableAdminUser(id);
      },
    );
  }
}
