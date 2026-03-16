import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminUserEntity } from '../entities/admin-user.entity';
import { AdminAuditLogEntity } from '../entities/admin-audit-log.entity';
import { AdminGroupEntity } from '../entities/admin-group.entity';
import {
  PLATFORM_PERMISSIONS_KEY,
  PUBLIC_ADMIN_KEY,
} from '../decorators/require-permission.decorator';

interface PermissionRequirement {
  type: 'all' | 'any';
  permissions: string[];
}

// Keycloak role that grants platform admin access
const PLATFORM_ADMIN_ROLE = 'platform_admin';

// Platform admin emails loaded from PLATFORM_ADMIN_EMAILS env var (comma-separated)
// e.g. PLATFORM_ADMIN_EMAILS=tony@plainledger.ca,antoine@tablix.ca
function getPlatformAdminEmails(configService: ConfigService): string[] {
  const raw = configService.get<string>('PLATFORM_ADMIN_EMAILS') || '';
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
}

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  private readonly logger = new Logger(PlatformAdminGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    @InjectRepository(AdminUserEntity)
    private readonly adminUserRepository: Repository<AdminUserEntity>,
    @InjectRepository(AdminAuditLogEntity)
    private readonly auditLogRepository: Repository<AdminAuditLogEntity>,
    @InjectRepository(AdminGroupEntity)
    private readonly adminGroupRepository: Repository<AdminGroupEntity>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if endpoint is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_ADMIN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // DEVELOPMENT ONLY: Skip auth when SKIP_AUTH=true
    const skipAuth = this.configService.get<string>('SKIP_AUTH') === 'true';
    const nodeEnv = this.configService.get<string>('NODE_ENV');
    const isProduction = nodeEnv === 'production';

    if (skipAuth && !isProduction) {
      this.logger.warn('PlatformAdminGuard: SKIP_AUTH enabled - using mock admin user');
      // Create a mock admin user with all permissions for development
      request.user = {
        sub: 'dev-admin-123',
        email: 'dev-admin@plainledger.ca',
        preferred_username: 'dev-admin',
        name: 'Development Admin',
      };
      request.adminUser = {
        id: 'dev-admin-123',
        keycloakId: 'dev-admin-123',
        email: 'dev-admin@plainledger.ca',
        displayName: 'Development Admin',
        isActive: true,
        groups: [],
      };
      // Grant all permissions in dev mode
      request.adminPermissions = new Set([
        'org:list',
        'org:view',
        'org:create',
        'org:edit',
        'org:delete',
        'org:hard_delete',
        'user:list',
        'user:view',
        'user:create',
        'user:edit',
        'user:delete',
        'user:impersonate',
        'admin:list',
        'admin:create',
        'admin:disable',
        'group:list',
        'group:assign',
        'billing:view',
        'billing:manage',
        'audit:view',
        'audit:export',
        'health:view',
        'sync:view',
        'sync:manage',
        'notification:list',
        'notification:create',
        'notification:delete',
        'integration:view',
        'integration:manage',
        'onboarding:view',
        'onboarding:manage',
        'communication:view',
        'communication:send',
        'chat:view',
        'chat:respond',
      ]);
      return true;
    }

    // Extract user from request - either set by Keycloak AuthGuard or decode JWT ourselves
    // (Admin controllers use @Unprotected() to bypass Keycloak guards, so we must handle JWT decoding)
    let user = request.user;
    if (!user?.sub) {
      user = this.decodeJwtFromRequest(request);
      if (user) {
        request.user = user;
      }
    }

    // User must be authenticated
    if (!user?.sub) {
      this.logger.warn('PlatformAdminGuard: No authenticated user - no valid JWT token');
      throw new UnauthorizedException('Authentication required');
    }

    // Find admin user by Keycloak ID
    let adminUser = await this.adminUserRepository.findOne({
      where: { keycloakId: user.sub, isActive: true },
      relations: ['groups', 'groups.permissions'],
    });

    // Check if user has platform-admin role in Keycloak
    const hasPlatformAdminRole = this.hasKeycloakRole(user, PLATFORM_ADMIN_ROLE);

    // Fallback: Check if email is in allowed list (from PLATFORM_ADMIN_EMAILS env var)
    const platformAdminEmails = getPlatformAdminEmails(this.configService);
    const isEmailAllowed = user.email && platformAdminEmails.includes(user.email.toLowerCase());

    // Log for debugging
    this.logger.log(`PlatformAdminGuard: Checking access for ${user.email}`);
    this.logger.log(
      `PlatformAdminGuard: hasPlatformAdminRole=${hasPlatformAdminRole}, isEmailAllowed=${isEmailAllowed}`,
    );
    this.logger.log(`PlatformAdminGuard: realm_access=${JSON.stringify(user.realm_access)}`);

    // Allow access if user has role OR email is in allowed list
    const canAutoProvision = hasPlatformAdminRole || isEmailAllowed;

    // Auto-provision admin for users with platform-admin Keycloak role OR allowed email
    if (!adminUser && canAutoProvision) {
      this.logger.log(
        `PlatformAdminGuard: Auto-provisioning admin for ${user.email} (role=${hasPlatformAdminRole}, email=${isEmailAllowed})`,
      );
      adminUser = await this.autoProvisionAdmin(user);

      // If full auto-provisioning failed (e.g. group doesn't exist), create bare admin user
      // The super admin bypass below will grant all permissions regardless
      if (!adminUser) {
        this.logger.warn(
          `PlatformAdminGuard: Full auto-provision failed for ${user.email}, creating bare admin user`,
        );
        adminUser = await this.createBareAdminUser(user);
      }
    }

    // Fix existing admin users who have no groups assigned (repair previous failed provisioning)
    if (adminUser && (!adminUser.groups || adminUser.groups.length === 0) && canAutoProvision) {
      this.logger.log(`PlatformAdminGuard: Fixing group assignment for ${user.email}`);
      adminUser = await this.fixAdminGroups(adminUser);
    }

    if (!adminUser) {
      this.logger.warn(
        `PlatformAdminGuard: User ${user.email || user.preferred_username} (${user.sub}) is not a platform admin - access denied`,
      );
      // Log unauthorized access attempt
      await this.logUnauthorizedAccess(user, request);
      // DENY access - only users in admin_users table can access admin endpoints
      throw new ForbiddenException(
        'You do not have permission to access the admin panel. Only platform administrators can access this area.',
      );
    }

    // Get required permissions for this endpoint
    const requiredPermissions = this.reflector.getAllAndOverride<PermissionRequirement[]>(
      PLATFORM_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // SUPER ADMIN BYPASS: Users with platform_admin Keycloak role get all permissions
    // This ensures platform admins can always access everything, even if DB permissions aren't set up
    if (hasPlatformAdminRole || isEmailAllowed) {
      this.logger.log(
        `PlatformAdminGuard: Super admin bypass for ${adminUser.email} - granting all permissions`,
      );
      request.adminUser = adminUser;
      request.adminPermissions = new Set([
        'org:list',
        'org:view',
        'org:create',
        'org:edit',
        'org:delete',
        'org:hard_delete',
        'user:list',
        'user:view',
        'user:create',
        'user:edit',
        'user:delete',
        'user:impersonate',
        'admin:list',
        'admin:create',
        'admin:disable',
        'group:list',
        'group:assign',
        'billing:view',
        'billing:manage',
        'audit:view',
        'audit:export',
        'health:view',
        'sync:view',
        'sync:manage',
        'notification:list',
        'notification:create',
        'notification:delete',
        'integration:view',
        'integration:manage',
        'onboarding:view',
        'onboarding:manage',
        'communication:view',
        'communication:send',
        'chat:view',
        'chat:respond',
        'dashboard:view',
        'settings:view',
        'settings:manage',
      ]);
      // Update last access
      await this.adminUserRepository.update(adminUser.id, { lastAccessAt: new Date() });
      return true;
    }

    // If no specific permissions required, just being an admin is enough
    if (!requiredPermissions || requiredPermissions.length === 0) {
      request.adminUser = adminUser;
      return true;
    }

    // Get user's effective permissions
    const userPermissions = this.getUserPermissions(adminUser);

    // Check permission requirements
    const hasPermission = this.checkPermissions(requiredPermissions, userPermissions);

    if (!hasPermission) {
      this.logger.warn(
        `PlatformAdminGuard: User ${adminUser.email} lacks required permissions: ${JSON.stringify(requiredPermissions)}`,
      );
      await this.logPermissionDenied(adminUser, requiredPermissions, request);
      throw new ForbiddenException('You do not have permission to perform this action');
    }

    // Update last access
    await this.adminUserRepository.update(adminUser.id, { lastAccessAt: new Date() });

    // Attach admin user to request for use in controllers
    request.adminUser = adminUser;
    request.adminPermissions = userPermissions;

    return true;
  }

  private getUserPermissions(adminUser: AdminUserEntity): Set<string> {
    const permissions = new Set<string>();

    for (const group of adminUser.groups || []) {
      for (const permission of group.permissions || []) {
        permissions.add(permission.id);
      }
    }

    return permissions;
  }

  private checkPermissions(
    requirements: PermissionRequirement[],
    userPermissions: Set<string>,
  ): boolean {
    // Each requirement must be satisfied
    for (const req of requirements) {
      if (req.type === 'all') {
        // User must have ALL permissions in this requirement
        const hasAll = req.permissions.every((p) => userPermissions.has(p));
        if (!hasAll) return false;
      } else {
        // User must have ANY permission in this requirement
        const hasAny = req.permissions.some((p) => userPermissions.has(p));
        if (!hasAny) return false;
      }
    }

    return true;
  }

  private async logUnauthorizedAccess(user: any, request: any): Promise<void> {
    try {
      await this.auditLogRepository.save({
        adminEmail: user.email,
        action: 'admin:unauthorized_access',
        resourceType: 'admin',
        metadata: {
          endpoint: request.url,
          method: request.method,
        },
        ipAddress: this.getClientIp(request),
        userAgent: request.headers['user-agent'],
        success: false,
        errorMessage: 'User is not a platform admin',
      });
    } catch (error) {
      this.logger.error('Failed to log unauthorized access', error);
    }
  }

  private async logPermissionDenied(
    adminUser: AdminUserEntity,
    requiredPermissions: PermissionRequirement[],
    request: any,
  ): Promise<void> {
    try {
      await this.auditLogRepository.save({
        adminUserId: adminUser.id,
        adminEmail: adminUser.email,
        action: 'admin:permission_denied',
        resourceType: 'admin',
        metadata: {
          endpoint: request.url,
          method: request.method,
          requiredPermissions,
        },
        ipAddress: this.getClientIp(request),
        userAgent: request.headers['user-agent'],
        success: false,
        errorMessage: 'Insufficient permissions',
      });
    } catch (error) {
      this.logger.error('Failed to log permission denied', error);
    }
  }

  private getClientIp(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.ip
    );
  }

  /**
   * Create a bare admin user without group assignment (fallback when group doesn't exist)
   * The super admin bypass will grant all permissions for allowed emails
   */
  private async createBareAdminUser(user: any): Promise<AdminUserEntity | null> {
    try {
      const newAdmin = this.adminUserRepository.create({
        keycloakId: user.sub,
        email: user.email,
        displayName: user.name || user.preferred_username || user.email,
        isActive: true,
      });

      const savedAdmin = await this.adminUserRepository.save(newAdmin);
      this.logger.log(
        `PlatformAdminGuard: Created bare admin user ${savedAdmin.id} for ${user.email}`,
      );

      return this.adminUserRepository.findOne({
        where: { id: savedAdmin.id },
        relations: ['groups', 'groups.permissions'],
      });
    } catch (error) {
      this.logger.error(`PlatformAdminGuard: Failed to create bare admin for ${user.email}`, error);
      return null;
    }
  }

  /**
   * Decode JWT token from Authorization header when Keycloak guards are bypassed (@Unprotected)
   */
  private decodeJwtFromRequest(request: any): any | null {
    try {
      const authHeader = request.headers?.authorization;
      if (!authHeader) {
        return null;
      }

      const [type, token] = authHeader.split(' ');
      if (type !== 'Bearer' || !token) {
        return null;
      }

      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));

      // Check expiration
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        this.logger.warn('PlatformAdminGuard: JWT token expired');
        return null;
      }

      this.logger.log(
        `PlatformAdminGuard: Decoded JWT for ${payload.email || payload.preferred_username}`,
      );

      return {
        sub: payload.sub,
        email: payload.email,
        preferred_username: payload.preferred_username,
        name: payload.name || payload.given_name,
        realm_access: payload.realm_access,
        resource_access: payload.resource_access,
      };
    } catch (error) {
      this.logger.error('PlatformAdminGuard: Failed to decode JWT', error);
      return null;
    }
  }

  /**
   * Check if user has a specific Keycloak role
   * Checks both realm_access and resource_access (client roles)
   */
  private hasKeycloakRole(user: any, role: string): boolean {
    // Check realm-level roles
    if (user.realm_access?.roles?.includes(role)) {
      return true;
    }

    // Check client-level roles for common client names
    const clientNames = ['plainledger-api', 'plainledger-web', 'plainledger-admin'];
    for (const client of clientNames) {
      if (user.resource_access?.[client]?.roles?.includes(role)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Fix admin user who exists but has no groups assigned
   */
  private async fixAdminGroups(adminUser: AdminUserEntity): Promise<AdminUserEntity | null> {
    try {
      // Find the Super Admin group
      const superAdminGroup = await this.adminGroupRepository.findOne({
        where: [{ name: 'Platform Owner' }, { name: 'Super Admin' }],
        relations: ['permissions'],
      });

      if (!superAdminGroup) {
        this.logger.error('PlatformAdminGuard: Super Admin group not found - cannot fix groups');
        return adminUser;
      }

      // Assign the group
      await this.adminUserRepository
        .createQueryBuilder()
        .relation(AdminUserEntity, 'groups')
        .of(adminUser)
        .add(superAdminGroup);

      this.logger.log(`PlatformAdminGuard: Fixed group assignment for ${adminUser.email}`);

      // Reload with relations
      return this.adminUserRepository.findOne({
        where: { id: adminUser.id },
        relations: ['groups', 'groups.permissions'],
      });
    } catch (error) {
      this.logger.error(`PlatformAdminGuard: Failed to fix groups for ${adminUser.email}`, error);
      return adminUser;
    }
  }

  /**
   * Auto-provision an admin user for allowed emails on first login
   */
  private async autoProvisionAdmin(user: any): Promise<AdminUserEntity | null> {
    try {
      // Find the Super Admin group with permissions
      const superAdminGroup = await this.adminGroupRepository.findOne({
        where: [{ name: 'Platform Owner' }, { name: 'Super Admin' }],
        relations: ['permissions'],
      });

      if (!superAdminGroup) {
        this.logger.error(
          'PlatformAdminGuard: Super Admin group not found - cannot auto-provision',
        );
        return null;
      }

      this.logger.log(
        `PlatformAdminGuard: Found Super Admin group with ${superAdminGroup.permissions?.length || 0} permissions`,
      );

      // Create the admin user first (without group)
      const newAdmin = this.adminUserRepository.create({
        keycloakId: user.sub,
        email: user.email,
        displayName: user.name || user.preferred_username || user.email,
        isActive: true,
      });

      const savedAdmin = await this.adminUserRepository.save(newAdmin);
      this.logger.log(`PlatformAdminGuard: Created admin user ${savedAdmin.id}`);

      // Now assign the group using query builder (ManyToMany requires this)
      await this.adminUserRepository
        .createQueryBuilder()
        .relation(AdminUserEntity, 'groups')
        .of(savedAdmin)
        .add(superAdminGroup);

      this.logger.log(`PlatformAdminGuard: Assigned Super Admin group to ${user.email}`);

      // Log the auto-provision event
      try {
        await this.auditLogRepository.save({
          adminUserId: savedAdmin.id,
          adminEmail: savedAdmin.email,
          action: 'admin:auto_provisioned',
          resourceType: 'admin',
          resourceId: savedAdmin.id,
          metadata: {
            keycloakId: user.sub,
            autoProvisionReason: 'Email in AUTO_PROVISION_ADMINS list',
            groupAssigned: 'Super Admin',
          },
          success: true,
        });
      } catch (auditError) {
        this.logger.error('Failed to log auto-provision event', auditError);
      }

      // Reload with relations to get the full object with groups and permissions
      const fullAdmin = await this.adminUserRepository.findOne({
        where: { id: savedAdmin.id },
        relations: ['groups', 'groups.permissions'],
      });

      this.logger.log(
        `PlatformAdminGuard: Auto-provisioned admin ${user.email} with ${fullAdmin?.groups?.length || 0} groups`,
      );

      return fullAdmin;
    } catch (error) {
      this.logger.error(
        `PlatformAdminGuard: Failed to auto-provision admin for ${user.email}`,
        error,
      );
      return null;
    }
  }
}
