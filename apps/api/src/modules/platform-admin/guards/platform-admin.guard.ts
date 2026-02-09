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
import { PLATFORM_PERMISSIONS_KEY, PUBLIC_ADMIN_KEY } from '../decorators/require-permission.decorator';

interface PermissionRequirement {
  type: 'all' | 'any';
  permissions: string[];
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
        'org:list', 'org:view', 'org:create', 'org:edit', 'org:delete', 'org:hard_delete',
        'user:list', 'user:view', 'user:create', 'user:edit', 'user:delete', 'user:impersonate',
        'admin:list', 'admin:create', 'admin:disable',
        'group:list', 'group:assign',
        'billing:view', 'billing:manage',
        'audit:view', 'audit:export',
        'health:view',
        'sync:view', 'sync:manage',
        'notification:list', 'notification:create', 'notification:delete',
        'integration:view', 'integration:manage',
        'onboarding:view', 'onboarding:manage',
        'communication:view', 'communication:send',
        'chat:view', 'chat:respond',
      ]);
      return true;
    }

    const user = request.user;

    // User must be authenticated
    if (!user?.sub) {
      this.logger.warn('PlatformAdminGuard: No authenticated user');
      throw new UnauthorizedException('Authentication required');
    }

    // Find admin user by Keycloak ID
    const adminUser = await this.adminUserRepository.findOne({
      where: { keycloakId: user.sub, isActive: true },
      relations: ['groups', 'groups.permissions'],
    });

    if (!adminUser) {
      this.logger.warn(`PlatformAdminGuard: User ${user.email || user.preferred_username} (${user.sub}) is not a platform admin - access denied`);
      // Log unauthorized access attempt
      await this.logUnauthorizedAccess(user, request);
      // DENY access - only users in admin_users table can access admin endpoints
      throw new ForbiddenException('You do not have permission to access the admin panel. Only platform administrators can access this area.');
    }

    // Get required permissions for this endpoint
    const requiredPermissions = this.reflector.getAllAndOverride<PermissionRequirement[]>(
      PLATFORM_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

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
        const hasAll = req.permissions.every(p => userPermissions.has(p));
        if (!hasAll) return false;
      } else {
        // User must have ANY permission in this requirement
        const hasAny = req.permissions.some(p => userPermissions.has(p));
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
}
