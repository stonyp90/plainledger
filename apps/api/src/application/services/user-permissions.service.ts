import { Injectable, Logger, ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProfileEntity } from '@infrastructure/persistence/postgres/entities/user-profile.entity';
import { OrganizationEntity } from '@infrastructure/persistence/postgres/entities/organization.entity';
import { RoleEntity } from '@infrastructure/persistence/postgres/entities/role.entity';
import { PermissionEntity } from '@infrastructure/persistence/postgres/entities/permission.entity';
import { SubscriptionPlanEntity } from '@infrastructure/persistence/postgres/entities/subscription-plan.entity';
import { OrganizationFeaturePolicyService } from './organization-feature-policy.service';
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
    private readonly featurePolicy: OrganizationFeaturePolicyService,
  ) {}

  /**
   * Get user's effective permissions and entitlements
   */
  async getUserPermissions(
    userId: string,
    organizationId: string,
  ): Promise<UserPermissions> {
    if (typeof userId !== 'string' || !userId.trim() || typeof organizationId !== 'string' || !organizationId.trim()) {
      throw new ForbiddenException('An authenticated user and organization are required');
    }
    // Fetch active membership first; the JWT may carry its tenant slug rather than UUID.
    const userProfile = await this.userProfileRepository.findOne({
      where: { id: userId, isActive: true },
      relations: ['organization'],
    });

    if (!userProfile?.organization || userProfile.organization.deletedAt ||
      ![userProfile.organizationId, userProfile.organization.tenantId].includes(organizationId)) {
      throw new ForbiddenException('Active membership in the authenticated organization is required');
    }
    organizationId = userProfile.organizationId!;

    // Get user's role (default to 'viewer' if not set)
    const roleId = userProfile.role || 'viewer';
    const role = await this.roleRepository.findOne({
      where: { id: roleId },
      relations: ['permissions'],
    });

    if (!role) throw new ServiceUnavailableException('The current membership role is not configured');
    const policy = await this.featurePolicy.read(organizationId);
    return {
      entitlements: policy.entitlements,
      permissions: (role.permissions || []).map((permission) => permission.id),
      limits: policy.limits,
      overrides: policy.overrides,
      role: { id: role.id, name: role.name, tierLevel: role.tierLevel },
      plan: { id: policy.plan.id, name: policy.plan.name },
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
