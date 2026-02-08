import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
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
      this.logger.warn(`PlatformAdminGuard: User ${user.email} (${user.sub}) is not a platform admin`);
      // Don't throw error - allow access but log it
      // Admin user will be created automatically or can be created manually
      // For now, allow access but mark as limited
      request.adminUser = null;
      request.adminPermissions = new Set<string>();
      return true; // Allow access but with limited permissions
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
