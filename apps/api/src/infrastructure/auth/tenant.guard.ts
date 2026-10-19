import {
  Injectable, CanActivate, ExecutionContext, ForbiddenException, BadRequestException, SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserProfileEntity } from "@infrastructure/persistence/postgres/entities/user-profile.entity";
import { assertSelectedOrganization } from "./keycloak-token";

export const BYPASS_TENANT_CHECK = "bypassTenantCheck";
export const BypassTenantCheck = () => SetMetadata(BYPASS_TENANT_CHECK, true);
export const CREATE_CLAIMED_TENANT = "createClaimedTenant";
export const CreateClaimedTenant = () => SetMetadata(CREATE_CLAIMED_TENANT, true);
const ORG_PARAM_NAMES = ["organizationId", "orgId", "tenantId"];

interface TenantUser {
  sub?: string;
  email?: string;
  emailVerified?: boolean;
  email_verified?: boolean;
  roles?: string[];
  realm_access?: { roles?: string[] };
  organizationId?: string;
  organization?: string;
  organization_id?: string;
  org_id?: string;
}

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    @InjectRepository(UserProfileEntity) private readonly userProfileRepository: Repository<UserProfileEntity>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as TenantUser | undefined;
    // Never pass undefined to TypeORM: it may otherwise omit the identity filter.
    if (!user || typeof user.sub !== "string" || !user.sub.trim()) {
      throw new ForbiddenException("Authentication required");
    }
    const claimedOrganization = user.organizationId || user.organization || user.organization_id || user.org_id;
    assertSelectedOrganization(request.headers?.["x-organization-id"], claimedOrganization || "");
    const organizationIds = this.extractOrganizationIds(request);
    if (this.isPlatformAdmin(user)) {
      request.validatedOrganizationId = organizationIds[0];
      return true;
    }
    if (this.reflector.getAllAndOverride<boolean>(BYPASS_TENANT_CHECK, [context.getHandler(), context.getClass()])) {
      throw new ForbiddenException("Platform administrator access required");
    }
    if (!organizationIds.length) return true;

    // Read membership for every request so deactivation/removal takes effect
    // immediately. Tenant IDs and organization primary keys are distinct.
    const profile = await this.userProfileRepository.findOne({
      where: { id: user.sub, isActive: true }, relations: ["organization"],
    });
    if (!profile && claimedOrganization && organizationIds.every((id) => id === claimedOrganization)
      && this.reflector.getAllAndOverride<boolean>(CREATE_CLAIMED_TENANT, [context.getHandler(), context.getClass()])) {
      return true;
    }
    if (!profile?.organizationId || !profile.organization || profile.organization.deletedAt || !organizationIds.every((id) =>
      id === profile.organizationId || id === profile.organization?.tenantId)) {
      throw new ForbiddenException("You do not have access to this organization");
    }
    request.validatedOrganizationId = profile.organizationId;
    return true;
  }

  private extractOrganizationIds(request: { params?: Record<string, unknown>; query?: Record<string, unknown>; body?: Record<string, unknown> }): string[] {
    const ids = new Set<string>();
    for (const source of [request.params, request.query, request.body]) {
      for (const name of ORG_PARAM_NAMES) {
        const value = source?.[name];
        if (value === undefined) continue;
        if (typeof value !== "string" || !value.trim() || value.length > 100 || value.trim() !== value) {
          throw new BadRequestException("Invalid organization identifier");
        }
        ids.add(value);
      }
    }
    return [...ids];
  }

  private isPlatformAdmin(user: TenantUser): boolean {
    const roles = user.realm_access?.roles ?? user.roles ?? [];
    if (Array.isArray(roles) && (roles.includes("super-admin") || roles.includes("platform-admin"))) return true;
    if ((user.email_verified === true || user.emailVerified === true) && user.email) {
      const admins = (this.configService.get<string>("PLATFORM_ADMIN_EMAILS") || "")
        .split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
      return admins.includes(user.email.toLowerCase());
    }
    return false;
  }
}

export async function validateOrganizationAccess(
  repository: Repository<UserProfileEntity>, userId: string, organizationId: string,
): Promise<boolean> {
  if (typeof userId !== "string" || !userId.trim() || typeof organizationId !== "string" || !organizationId.trim()) return false;
  return !!await repository.findOne({ where: { id: userId, organizationId, isActive: true } });
}
