import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProfileEntity } from '@infrastructure/persistence/postgres/entities/user-profile.entity';
import { OrganizationEntity } from '@infrastructure/persistence/postgres/entities/organization.entity';
import { RoleEntity } from '@infrastructure/persistence/postgres/entities/role.entity';
import { PermissionEntity } from '@infrastructure/persistence/postgres/entities/permission.entity';
import { SubscriptionPlanEntity } from '@infrastructure/persistence/postgres/entities/subscription-plan.entity';
import { EntitlementEntity } from '@infrastructure/persistence/postgres/entities/entitlement.entity';

export interface UserPermissions {
  entitlements: string[]; // From org's subscription plan
  permissions: string[]; // From user's role
  limits: Record<string, number>; // Usage limits from plan
  overrides: string[]; // Org-specific entitlement overrides
  role: {
    id: string;
    name: string;
    tierLevel: number;
  };
  plan: {
    id: string;
    name: string;
  };
}

@Injectable()
export class UserPermissionsService {
  private readonly logger = new Logger(UserPermissionsService.name);

  constructor(
    @InjectRepository(UserProfileEntity)
    private readonly userProfileRepository: Repository<UserProfileEntity>,
    @InjectRepository(OrganizationEntity)
    private readonly organizationRepository: Repository<OrganizationEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    @InjectRepository(PermissionEntity)
    private readonly permissionRepository: Repository<PermissionEntity>,
    @InjectRepository(SubscriptionPlanEntity)
    private readonly subscriptionPlanRepository: Repository<SubscriptionPlanEntity>,
    @InjectRepository(EntitlementEntity)
    private readonly entitlementRepository: Repository<EntitlementEntity>,
  ) {}

  /**
   * Get user's effective permissions and entitlements
   */
  async getUserPermissions(
    userId: string,
    organizationId: string,
  ): Promise<UserPermissions> {
    // Fetch user profile with organization
    const userProfile = await this.userProfileRepository.findOne({
      where: { id: userId, organizationId },
      relations: ['organization'],
    });

    if (!userProfile) {
      throw new Error(`User ${userId} not found in organization ${organizationId}`);
    }

    // Get user's role (default to 'viewer' if not set)
    const roleId = userProfile.role || 'viewer';
    const role = await this.roleRepository.findOne({
      where: { id: roleId },
      relations: ['permissions'],
    });

    if (!role) {
      this.logger.warn(`Role ${roleId} not found, defaulting to viewer`);
      const defaultRole = await this.roleRepository.findOne({
        where: { id: 'viewer' },
        relations: ['permissions'],
      });
      if (!defaultRole) {
        throw new Error('Default viewer role not found');
      }
      return this.buildPermissions(userProfile.organization!, defaultRole, null);
    }

    // Get organization's subscription plan
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
      relations: ['subscriptionPlan'],
    });

    if (!organization) {
      throw new Error(`Organization ${organizationId} not found`);
    }

    const planId = organization.subscriptionPlanId || 'free';
    const plan = await this.subscriptionPlanRepository.findOne({
      where: { id: planId },
      relations: ['entitlements'],
    });

    if (!plan) {
      this.logger.warn(`Plan ${planId} not found, defaulting to free`);
      const defaultPlan = await this.subscriptionPlanRepository.findOne({
        where: { id: 'free' },
        relations: ['entitlements'],
      });
      if (!defaultPlan) {
        throw new Error('Default free plan not found');
      }
      return this.buildPermissions(organization, role, defaultPlan);
    }

    return this.buildPermissions(organization, role, plan);
  }

  /**
   * Build permissions object from role and plan
   */
  private buildPermissions(
    organization: OrganizationEntity,
    role: RoleEntity,
    plan: SubscriptionPlanEntity | null,
  ): UserPermissions {
    // Get permissions from role
    const permissions = (role.permissions || []).map((p) => p.id);

    // Get entitlements from plan
    const entitlements = (plan?.entitlements || []).map((e) => e.id);

    // Get limits from plan
    const limits = plan?.limits || {};

    // TODO: Fetch organization entitlement overrides from database
    // For now, return empty array
    const overrides: string[] = [];

    return {
      entitlements,
      permissions,
      limits,
      overrides,
      role: {
        id: role.id,
        name: role.name,
        tierLevel: role.tierLevel,
      },
      plan: {
        id: plan?.id || 'free',
        name: plan?.name || 'Free',
      },
    };
  }

  /**
   * Check if user has a specific entitlement
   */
  hasEntitlement(permissions: UserPermissions, entitlement: string): boolean {
    return (
      permissions.entitlements.includes(entitlement) ||
      permissions.overrides.includes(entitlement)
    );
  }

  /**
   * Check if user has a specific permission
   */
  hasPermission(permissions: UserPermissions, permission: string): boolean {
    return permissions.permissions.includes(permission);
  }

  /**
   * Check if usage is within limit
   */
  isWithinLimit(
    permissions: UserPermissions,
    limitKey: string,
    currentUsage: number,
  ): boolean {
    const limit = permissions.limits[limitKey];
    if (limit === undefined) {
      return false;
    }
    // -1 means unlimited
    if (limit === -1) {
      return true;
    }
    return currentUsage < limit;
  }

  /**
   * Get remaining quota for a limit
   */
  getRemainingQuota(
    permissions: UserPermissions,
    limitKey: string,
    currentUsage: number,
  ): number {
    const limit = permissions.limits[limitKey];
    if (limit === undefined) {
      return 0;
    }
    // -1 means unlimited
    if (limit === -1) {
      return Infinity;
    }
    return Math.max(0, limit - currentUsage);
  }
}
