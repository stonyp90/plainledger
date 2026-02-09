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
import { AdminUserService, UserListFilter, CreateUserServiceDto } from '../services/admin-user.service';
import { AdminAuditService } from '../services/admin-audit.service';
import { 
  CreateUserDto, 
  UpdateUserDto, 
  InviteUserDto,
  UserListResponseDto,
  UserStatsDto,
} from '../dto';

@ApiTags('Platform Admin - Users')
@ApiBearerAuth()
@Controller('admin/users')
@UseGuards(PlatformAdminGuard)
export class AdminUsersController {
  private readonly logger = new Logger(AdminUsersController.name);

  constructor(
    private readonly userService: AdminUserService,
    private readonly auditService: AdminAuditService,
  ) {}

  @Get()
  @RequirePermission('user:list')
  @ApiOperation({ summary: 'List all users', description: 'Returns paginated list of all users across organizations.' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by email, first name, or last name' })
  @ApiQuery({ name: 'organizationId', required: false, description: 'Filter by organization ID' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Filter by active status' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of results (default 50)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Pagination offset' })
  @ApiResponse({ status: 200, description: 'List of users', type: UserListResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async listUsers(
    @Query('search') search?: string,
    @Query('organizationId') organizationId?: string,
    @Query('isActive') isActive?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    try {
      const filter: UserListFilter = {
        search,
        organizationId,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        limit: limit ? Number(limit) : 50,
        offset: offset ? Number(offset) : 0,
      };

      return await this.userService.listUsers(filter);
    } catch (error) {
      this.logger.error(`Failed to list users: ${error.message}`, error.stack);
      return { users: [], total: 0 };
    }
  }

  @Get('stats')
  @RequirePermission('user:list')
  @ApiOperation({ summary: 'Get user statistics' })
  @ApiResponse({ status: 200, description: 'User statistics' })
  async getStats() {
    return this.userService.getUserStats();
  }

  @Get(':id')
  @RequirePermission('user:view')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUser(@Param('id') id: string) {
    return this.userService.getUser(id);
  }

  @Post()
  @RequirePermission('user:create')
  @ApiOperation({ summary: 'Create user on behalf of customer' })
  @ApiResponse({ status: 201, description: 'User created' })
  async createUser(@Body() dto: CreateUserDto, @Req() req: any) {
    return this.auditService.logWithTiming(
      {
        adminUser: req.adminUser,
        action: 'user:create',
        resourceType: 'user',
        targetOrgId: dto.organizationId,
        metadata: { email: dto.email },
      },
      async () => {
        return this.userService.createUser(dto);
      },
    );
  }

  @Put(':id')
  @RequirePermission('user:edit')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'User updated' })
  async updateUser(@Param('id') id: string, @Body() updates: any, @Req() req: any) {
    const beforeState = await this.userService.getUser(id);

    return this.auditService.logWithTiming(
      {
        adminUser: req.adminUser,
        action: 'user:edit',
        resourceType: 'user',
        resourceId: id,
        targetUserId: id,
        targetUserEmail: beforeState.email,
        beforeState: beforeState as any,
        metadata: { updates },
      },
      async () => {
        return this.userService.updateUser(id, updates);
      },
    );
  }

  @Post(':id/disable')
  @RequirePermission('user:disable')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disable user account' })
  @ApiResponse({ status: 204, description: 'User disabled' })
  async disableUser(@Param('id') id: string, @Req() req: any) {
    const user = await this.userService.getUser(id);

    return this.auditService.logWithTiming(
      {
        adminUser: req.adminUser,
        action: 'user:disable',
        resourceType: 'user',
        resourceId: id,
        targetUserId: id,
        targetUserEmail: user.email,
      },
      async () => {
        await this.userService.disableUser(id);
      },
    );
  }

  @Post(':id/enable')
  @RequirePermission('user:disable')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Enable user account' })
  @ApiResponse({ status: 204, description: 'User enabled' })
  async enableUser(@Param('id') id: string, @Req() req: any) {
    const user = await this.userService.getUser(id);

    return this.auditService.logWithTiming(
      {
        adminUser: req.adminUser,
        action: 'user:enable',
        resourceType: 'user',
        resourceId: id,
        targetUserId: id,
        targetUserEmail: user.email,
      },
      async () => {
        await this.userService.enableUser(id);
      },
    );
  }

  @Post(':id/reset-password')
  @RequirePermission('user:reset_password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Send password reset email' })
  @ApiResponse({ status: 204, description: 'Password reset email sent' })
  async resetPassword(@Param('id') id: string, @Req() req: any) {
    const user = await this.userService.getUser(id);

    return this.auditService.logWithTiming(
      {
        adminUser: req.adminUser,
        action: 'user:reset_password',
        resourceType: 'user',
        resourceId: id,
        targetUserId: id,
        targetUserEmail: user.email,
      },
      async () => {
        await this.userService.resetPassword(id);
      },
    );
  }

  @Post(':id/force-logout')
  @RequirePermission('user:force_logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Force logout all user sessions' })
  @ApiResponse({ status: 204, description: 'User sessions terminated' })
  async forceLogout(@Param('id') id: string, @Req() req: any) {
    const user = await this.userService.getUser(id);

    return this.auditService.logWithTiming(
      {
        adminUser: req.adminUser,
        action: 'user:force_logout',
        resourceType: 'user',
        resourceId: id,
        targetUserId: id,
        targetUserEmail: user.email,
      },
      async () => {
        await this.userService.forceLogout(id);
      },
    );
  }

  @Delete(':id')
  @RequirePermission('user:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user (GDPR)' })
  @ApiResponse({ status: 204, description: 'User deleted' })
  async deleteUser(@Param('id') id: string, @Req() req: any) {
    const user = await this.userService.getUser(id);

    return this.auditService.logWithTiming(
      {
        adminUser: req.adminUser,
        action: 'user:delete',
        resourceType: 'user',
        resourceId: id,
        targetUserId: id,
        targetUserEmail: user.email,
        beforeState: user as any,
        metadata: { warning: 'GDPR DELETION' },
      },
      async () => {
        await this.userService.deleteUser(id);
      },
    );
  }

  @Post('invite')
  @RequirePermission('user:invite')
  @ApiOperation({ summary: 'Invite user to organization' })
  @ApiResponse({ status: 201, description: 'Invitation sent' })
  async inviteUser(
    @Body() body: { email: string; organizationId: string; role?: string },
    @Req() req: any,
  ) {
    return this.auditService.logWithTiming(
      {
        adminUser: req.adminUser,
        action: 'user:invite',
        resourceType: 'user',
        targetOrgId: body.organizationId,
        metadata: { email: body.email, role: body.role },
      },
      async () => {
        await this.userService.inviteUser(body.email, body.organizationId, body.role);
        return { success: true, message: 'Invitation sent' };
      },
    );
  }
}
