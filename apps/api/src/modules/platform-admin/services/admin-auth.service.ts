import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { AdminUserEntity } from '../entities/admin-user.entity';
import { AdminGroupEntity } from '../entities/admin-group.entity';
import { AdminPermissionEntity } from '../entities/admin-permission.entity';

export interface AdminUserWithPermissions {
  user: AdminUserEntity;
  permissions: string[];
  groups: string[];
  maxTierLevel: number;
}

@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger(AdminAuthService.name);

  constructor(
    @InjectRepository(AdminUserEntity)
    private readonly adminUserRepository: Repository<AdminUserEntity>,
    @InjectRepository(AdminGroupEntity)
    private readonly adminGroupRepository: Repository<AdminGroupEntity>,
    @InjectRepository(AdminPermissionEntity)
    private readonly permissionRepository: Repository<AdminPermissionEntity>,
  ) {}

  /**
   * Get admin user with all their effective permissions
   */
  async getAdminWithPermissions(keycloakId: string): Promise<AdminUserWithPermissions | null> {
    const user = await this.adminUserRepository.findOne({
      where: { keycloakId, isActive: true },
      relations: ['groups', 'groups.permissions'],
    });

    if (!user) {
      return null;
    }

    const permissions = new Set<string>();
    const groups: string[] = [];
    let maxTierLevel = 0;

    for (const group of user.groups || []) {
      groups.push(group.name);
      maxTierLevel = Math.max(maxTierLevel, group.tierLevel);

      for (const permission of group.permissions || []) {
        permissions.add(permission.id);
      }
    }

    return {
      user,
      permissions: Array.from(permissions),
      groups,
      maxTierLevel,
    };
  }

  /**
   * Check if user has a specific permission
   */
  async hasPermission(keycloakId: string, permissionId: string): Promise<boolean> {
    const admin = await this.getAdminWithPermissions(keycloakId);
    return admin?.permissions.includes(permissionId) ?? false;
  }

  /**
   * Check if user has any of the specified permissions
   */
  async hasAnyPermission(keycloakId: string, permissionIds: string[]): Promise<boolean> {
    const admin = await this.getAdminWithPermissions(keycloakId);
    return permissionIds.some(p => admin?.permissions.includes(p));
  }

  /**
   * Check if user has all of the specified permissions
   */
  async hasAllPermissions(keycloakId: string, permissionIds: string[]): Promise<boolean> {
    const admin = await this.getAdminWithPermissions(keycloakId);
    return permissionIds.every(p => admin?.permissions.includes(p));
  }

  /**
   * Get all available permissions grouped by category
   */
  async getAllPermissions(): Promise<Record<string, AdminPermissionEntity[]>> {
    const permissions = await this.permissionRepository.find({
      order: { category: 'ASC', id: 'ASC' },
    });

    const grouped: Record<string, AdminPermissionEntity[]> = {};
    for (const permission of permissions) {
      if (!grouped[permission.category]) {
        grouped[permission.category] = [];
      }
      grouped[permission.category].push(permission);
    }

    return grouped;
  }

  /**
   * Get all groups with their permissions
   */
  async getAllGroups(): Promise<AdminGroupEntity[]> {
    return this.adminGroupRepository.find({
      relations: ['permissions'],
      order: { tierLevel: 'ASC', name: 'ASC' },
    });
  }

  /**
   * Create a new admin user
   */
  async createAdminUser(
    keycloakId: string,
    email: string,
    displayName: string,
    groupIds: string[],
    invitedById?: string,
  ): Promise<AdminUserEntity> {
    const user = this.adminUserRepository.create({
      keycloakId,
      email,
      displayName,
      invitedById,
    });

    await this.adminUserRepository.save(user);

    if (groupIds.length > 0) {
      await this.assignUserToGroups(user.id, groupIds);
    }

    const updatedUser = await this.adminUserRepository.findOne({
      where: { id: user.id },
      relations: ['groups', 'groups.permissions'],
    });
    
    if (!updatedUser) {
      throw new Error('Failed to retrieve created admin user');
    }
    
    return updatedUser;
  }

  /**
   * Assign user to groups
   */
  async assignUserToGroups(userId: string, groupIds: string[]): Promise<void> {
    const user = await this.adminUserRepository.findOne({
      where: { id: userId },
      relations: ['groups'],
    });

    if (!user) {
      throw new Error('Admin user not found');
    }

    const groups = await this.adminGroupRepository.find({
      where: { id: In(groupIds) },
    });

    user.groups = groups;
    await this.adminUserRepository.save(user);
  }

  /**
   * Remove user from groups
   */
  async removeUserFromGroups(userId: string, groupIds: string[]): Promise<void> {
    const user = await this.adminUserRepository.findOne({
      where: { id: userId },
      relations: ['groups'],
    });

    if (!user) {
      throw new Error('Admin user not found');
    }

    user.groups = user.groups.filter(g => !groupIds.includes(g.id));
    await this.adminUserRepository.save(user);
  }

  /**
   * Disable an admin user
   */
  async disableAdminUser(userId: string): Promise<void> {
    await this.adminUserRepository.update(userId, { isActive: false });
  }

  /**
   * Enable an admin user
   */
  async enableAdminUser(userId: string): Promise<void> {
    await this.adminUserRepository.update(userId, { isActive: true });
  }

  /**
   * Get all admin users with their groups
   */
  async getAllAdmins(): Promise<{ admins: Array<{
    id: string;
    email: string;
    displayName: string;
    isActive: boolean;
    groups: string[];
    createdAt: Date;
    lastLoginAt?: Date;
  }> }> {
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
}
