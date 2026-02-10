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
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { PlatformAdminGuard } from '../guards/platform-admin.guard';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { AdminAuthService } from '../services/admin-auth.service';
import { AdminAuditService } from '../services/admin-audit.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminUserEntity } from '../entities/admin-user.entity';
import { 
  CreateAdminUserDto, 
  AssignGroupsDto, 
  AdminUserResponseDto,
  PermissionDto,
  GroupDto,
} from '../dto';
import { IKeycloakAdminService } from '@application/ports/outbound/IKeycloakAdminService';
import { Inject } from '@nestjs/common';
import { SESAdapter } from '@infrastructure/adapters/email/ses/ses.adapter';
import { ConfigService } from '@nestjs/config';

@ApiTags('Platform Admin - Admin Management')
@ApiBearerAuth()
@Controller('admin/admins')
@UseGuards(PlatformAdminGuard)
export class AdminAdminsController {
  private readonly logger = new Logger(AdminAdminsController.name);

  constructor(
    private readonly authService: AdminAuthService,
    private readonly auditService: AdminAuditService,
    @InjectRepository(AdminUserEntity)
    private readonly adminUserRepository: Repository<AdminUserEntity>,
    @Inject('IKeycloakAdminService')
    private readonly keycloakAdmin: IKeycloakAdminService,
    private readonly emailService: SESAdapter,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @RequirePermission('admin:list')
  @ApiOperation({ summary: 'List all admin users', description: 'Returns all platform admin users with their groups.' })
  @ApiResponse({ status: 200, description: 'List of admin users' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async listAdmins() {
    const admins = await this.adminUserRepository.find({
      relations: ['groups'],
      order: { createdAt: 'DESC' },
    });

    return {
      admins: admins.map(admin => ({
        id: admin.id,
        email: admin.email,
        displayName: admin.displayName,
        isActive: admin.isActive,
        groups: admin.groups?.map(g => g.name) || [],
        createdAt: admin.createdAt,
        lastLoginAt: admin.lastAccessAt,
      })),
    };
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
  @ApiOperation({ summary: 'Create new admin user', description: 'Invites a new platform admin user. Creates in Keycloak if needed and sends invitation email.' })
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
        let keycloakId = body.keycloakId;
        let isNewKeycloakUser = false;

        // If no keycloakId provided, try to find or create user in Keycloak
        if (!keycloakId) {
          // Check if user exists in Keycloak
          const existingUser = await this.keycloakAdmin.findUserByEmail(body.email);
          
          if (existingUser) {
            keycloakId = existingUser.id;
            this.logger.log(`Found existing Keycloak user for ${body.email}: ${keycloakId}`);
          } else {
            // Create new user in Keycloak with temporary password
            this.logger.log(`Creating new Keycloak user for ${body.email}`);
            const newUser = await this.keycloakAdmin.createUser({
              email: body.email,
              firstName: body.displayName?.split(' ')[0] || 'Admin',
              lastName: body.displayName?.split(' ').slice(1).join(' ') || 'User',
              emailVerified: true,
              sendVerificationEmail: false,
              attributes: {
                adminInvite: ['true'],
                invitedBy: [req.adminUser?.email || 'system'],
              },
            });
            keycloakId = newUser.id;
            isNewKeycloakUser = true;
            this.logger.log(`Created Keycloak user ${keycloakId} for ${body.email}`);
          }
        }

        // Check if admin already exists in our DB
        const existingAdmin = await this.adminUserRepository.findOne({
          where: { email: body.email },
        });
        
        if (existingAdmin) {
          throw new BadRequestException(`Admin user with email ${body.email} already exists`);
        }

        // Create admin user in our database
        const admin = await this.authService.createAdminUser(
          keycloakId,
          body.email,
          body.displayName,
          body.groupIds || [],
          req.adminUser?.id,
        );

        // Send invitation email
        try {
          const frontendUrl = this.configService.get<string>('ADMIN_URL', 'https://admin.plainledger.ca');
          await this.emailService.sendAdminInviteEmail(
            body.email,
            body.displayName || 'Admin',
            req.adminUser?.email || 'PlainLedger',
            `${frontendUrl}/login`,
          );
          this.logger.log(`Sent admin invitation email to ${body.email}`);
        } catch (emailError) {
          this.logger.warn(`Failed to send invitation email: ${emailError.message}`);
          // Don't fail the request if email fails
        }

        // If this is a new Keycloak user, send password reset email
        if (isNewKeycloakUser) {
          try {
            await this.keycloakAdmin.sendPasswordResetEmail(keycloakId);
            this.logger.log(`Sent password reset email to ${body.email}`);
          } catch (resetError) {
            this.logger.warn(`Failed to send password reset email: ${resetError.message}`);
          }
        }

        return {
          id: admin.id,
          email: admin.email,
          displayName: admin.displayName,
          groups: admin.groups?.map(g => g.name) || [],
          isNewUser: isNewKeycloakUser,
        };
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

  @Delete(':id')
  @RequirePermission('admin:disable')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove admin user', description: 'Removes admin privileges. Does not delete Keycloak account.' })
  @ApiParam({ name: 'id', description: 'Admin user ID' })
  @ApiResponse({ status: 204, description: 'Admin removed successfully' })
  @ApiResponse({ status: 404, description: 'Admin not found' })
  async removeAdmin(@Param('id') id: string, @Req() req: any) {
    return this.auditService.logWithTiming(
      {
        adminUser: req.adminUser,
        action: 'admin:delete',
        resourceType: 'admin',
        resourceId: id,
      },
      async () => {
        const admin = await this.adminUserRepository.findOne({
          where: { id },
        });
        
        if (!admin) {
          throw new BadRequestException(`Admin user ${id} not found`);
        }

        // Prevent self-deletion
        if (req.adminUser?.id === id) {
          throw new BadRequestException('Cannot remove your own admin account');
        }

        // Remove from database (soft delete by disabling)
        await this.adminUserRepository.delete(id);
        
        this.logger.log(`Admin user ${admin.email} removed by ${req.adminUser?.email}`);
      },
    );
  }
}
