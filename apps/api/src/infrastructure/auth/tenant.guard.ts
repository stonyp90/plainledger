/**
 * TenantGuard - Multi-tenancy security guard
 *
 * Validates that the authenticated user belongs to the organization
 * they're trying to access. This is a CRITICAL security measure for
 * multi-tenant isolation.
 *
 * Features:
 * - Validates user membership in claimed organization
 * - Supports route parameter extraction (:organizationId, :orgId)
 * - Caches membership checks for performance
 * - Logs all access attempts for audit
 * - Supports admin override for super-admins
 *
 * Usage:
 * @UseGuards(JwtAuthGuard, TenantGuard)
 * @Controller('organizations/:organizationId/...')
 */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
  Inject,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { SetMetadata } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserProfileEntity } from "@infrastructure/persistence/postgres/entities/user-profile.entity";
import { CacheService } from "@infrastructure/cache/cache.service";

// Metadata key for bypassing tenant check
export const BYPASS_TENANT_CHECK = "bypassTenantCheck";

// Decorator to bypass tenant check (use sparingly - only for super-admin routes)
export const BypassTenantCheck = () => SetMetadata(BYPASS_TENANT_CHECK, true);

// Route parameter names to check for organization ID
const ORG_PARAM_NAMES = ["organizationId", "orgId", "tenantId"];

// Cache TTL for membership checks (5 minutes)
const MEMBERSHIP_CACHE_TTL = 300;

@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);

  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(UserProfileEntity)
    private readonly userProfileRepository: Repository<UserProfileEntity>,
    @Inject(CacheService)
    private readonly cacheService: CacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if tenant check should be bypassed
    const bypassCheck = this.reflector.getAllAndOverride<boolean>(
      BYPASS_TENANT_CHECK,
      [context.getHandler(), context.getClass()],
    );

    if (bypassCheck) {
      this.logger.debug("Tenant check bypassed by decorator");
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // User must be authenticated (JwtAuthGuard should run first)
    if (!user) {
      this.logger.error("TenantGuard: No user in request context");
      throw new ForbiddenException("Authentication required");
    }

    // Super-admins can access any organization
    if (this.isSuperAdmin(user)) {
      this.logger.debug(`Super-admin access: ${user.email}`);
      return true;
    }

    // Extract organization ID from route params or query
    const requestedOrgId = this.extractOrganizationId(request);

    // If no organization ID in request, allow (org will be from user's token)
    if (!requestedOrgId) {
      this.logger.debug("No organization ID in request, using token org");
      return true;
    }

    // Validate user belongs to the requested organization
    const hasAccess = await this.validateMembership(user.sub, requestedOrgId);

    if (!hasAccess) {
      this.logger.warn(
        `[Security] Unauthorized org access attempt: User ${user.email} tried to access org ${requestedOrgId}`,
      );
      throw new ForbiddenException(
        "You do not have access to this organization",
      );
    }

    // Log successful access for audit
    this.logger.debug(
      `[Audit] Tenant access granted: ${user.email} -> ${requestedOrgId}`,
    );

    // Attach validated organization ID to request
    request.validatedOrganizationId = requestedOrgId;

    return true;
  }

  /**
   * Extract organization ID from request params or query
   */
  private extractOrganizationId(request: any): string | null {
    // Check route params first
    for (const paramName of ORG_PARAM_NAMES) {
      if (request.params?.[paramName]) {
        return request.params[paramName];
      }
    }

    // Check query params
    for (const paramName of ORG_PARAM_NAMES) {
      if (request.query?.[paramName]) {
        return request.query[paramName];
      }
    }

    // Check request body
    for (const paramName of ORG_PARAM_NAMES) {
      if (request.body?.[paramName]) {
        return request.body[paramName];
      }
    }

    return null;
  }

  /**
   * Check if user is a super-admin
   */
  private isSuperAdmin(user: { roles?: string[]; email?: string }): boolean {
    // Check for super-admin role
    if (user.roles?.includes("super-admin")) {
      return true;
    }

    // Check for PlainLedger admin email domain
    if (user.email?.endsWith("@plainledger.ca")) {
      return true;
    }

    return false;
  }

  /**
   * Validate user membership in organization
   * Uses caching for performance
   */
  private async validateMembership(
    userId: string,
    organizationId: string,
  ): Promise<boolean> {
    const cacheKey = `tenant:membership:${userId}:${organizationId}`;

    // Check cache first
    const cached = await this.cacheService.get<boolean>(cacheKey);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    // Query database
    const userProfile = await this.userProfileRepository.findOne({
      where: {
        id: userId,
        organizationId: organizationId,
        isActive: true,
      },
    });

    const isMember = !!userProfile;

    // Cache the result
    await this.cacheService.set(cacheKey, isMember, MEMBERSHIP_CACHE_TTL);

    return isMember;
  }
}

/**
 * Helper function to validate organization access in services
 * Use when you need to validate access outside of guards
 */
export async function validateOrganizationAccess(
  userProfileRepository: Repository<UserProfileEntity>,
  userId: string,
  organizationId: string,
): Promise<boolean> {
  const userProfile = await userProfileRepository.findOne({
    where: {
      id: userId,
      organizationId: organizationId,
      isActive: true,
    },
  });

  return !!userProfile;
}
