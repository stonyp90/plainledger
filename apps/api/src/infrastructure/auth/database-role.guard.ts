import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { GqlExecutionContext } from '@nestjs/graphql';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProfileEntity } from '@infrastructure/persistence/postgres/entities/user-profile.entity';

interface RoleMetadata {
  roles: string[];
  mode?: 'any' | 'all';
}

interface VerifiedRoleUser {
  sub?: unknown;
  roles?: unknown;
  realm_access?: { roles?: unknown };
  resource_access?: Record<string, { roles?: unknown }>;
  organizationId?: unknown;
  organization?: unknown;
  organization_id?: unknown;
  org_id?: unknown;
}

interface RoleRequest {
  user?: VerifiedRoleUser;
  headers?: Record<string, unknown>;
  params?: Record<string, unknown>;
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
}

const TENANT_ROLE_NAMES = new Set([
  'user',
  'plainledger_user',
  'owner',
  'admin',
  'organization_admin',
  'member',
  'accountant',
  'viewer',
]);

// Platform privileges are realm privileges, never an inference from a DB owner
// or an identically named role belonging to an unrelated client application.
const PLATFORM_ROLES = new Set([
  'platform_admin',
  'platform-admin',
  'super_admin',
  'super-admin',
  'plainledger_cpa_admin',
]);
const ORGANIZATION_SELECTORS = ['organizationId', 'orgId', 'tenantId'];

/**
 * Runs after authentication. It consumes only the verified request.user supplied
 * by the authentication guard; it never decodes an unverified JWT itself.
 * Tenant grants are read on every request so role changes take effect at once.
 */
@Injectable()
export class DatabaseRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
    @InjectRepository(UserProfileEntity)
    private readonly profiles: Repository<UserProfileEntity>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      this.reflector.getAllAndOverride<boolean>('isPublic', [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    // Preserve nest-keycloak-connect's configured default: class metadata wins.
    const metadata = this.reflector.getAllAndOverride<RoleMetadata>('roles', [
      context.getClass(),
      context.getHandler(),
    ]);
    if (metadata === undefined) return true;
    if (
      !metadata ||
      !Array.isArray(metadata.roles) ||
      metadata.roles.some((role) => typeof role !== 'string' || !role || role.trim() !== role) ||
      (metadata.mode !== undefined && metadata.mode !== 'any' && metadata.mode !== 'all')
    )
      return false;
    if (!metadata.roles.length) return true;

    const { request, graphqlArgs } = this.requestContext(context);
    const user = request?.user;
    if (
      !request ||
      !user ||
      typeof user.sub !== 'string' ||
      !user.sub.trim() ||
      user.sub.trim() !== user.sub ||
      user.sub.length > 100
    )
      return false;
    const mode = metadata.mode ?? 'any';
    const tenantRoles = metadata.roles.filter((role) => this.tenantRoleName(role) !== null);
    const otherRoles = metadata.roles.filter((role) => this.tenantRoleName(role) === null);
    const signedResults = otherRoles.map((role) => this.hasSignedRole(user, role));
    if (mode === 'any' && signedResults.some(Boolean)) return true;
    if (mode === 'all' && signedResults.some((match) => !match)) return false;
    if (!tenantRoles.length) return mode === 'all';

    const organizationClaim = this.organizationClaim(user);
    if (!organizationClaim) return false;
    let profile: UserProfileEntity | null;
    try {
      profile = await this.profiles.findOne({
        where: { id: user.sub, isActive: true },
        relations: ['organization'],
      });
    } catch {
      throw new ServiceUnavailableException('Organization permissions are temporarily unavailable');
    }
    if (
      !profile?.isActive ||
      !profile.organizationId ||
      !profile.organization ||
      profile.organization.deletedAt ||
      profile.organization.id !== profile.organizationId ||
      ![profile.organizationId, profile.organization.tenantId].includes(organizationClaim)
    )
      return false;
    if (!this.matchesRequestedOrganization(request, graphqlArgs, organizationClaim, profile))
      return false;
    const matches = tenantRoles.map((role) =>
      this.hasDatabaseRole(profile!.role, this.tenantRoleName(role)!),
    );
    return mode === 'all' ? matches.every(Boolean) : matches.some(Boolean);
  }

  private requestContext(context: ExecutionContext): {
    request?: RoleRequest;
    graphqlArgs?: Record<string, unknown>;
  } {
    if (context.getType<string>() === 'graphql') {
      const gql = GqlExecutionContext.create(context);
      return { request: gql.getContext()?.req, graphqlArgs: gql.getArgs() };
    }
    if (context.getType<string>() !== 'http') return {};
    return { request: context.switchToHttp().getRequest<RoleRequest>() };
  }

  private tenantRoleName(role: string): string | null {
    const name = role.startsWith('realm:') ? role.slice(6) : role;
    // Explicit client:role names retain client-role semantics even when their
    // short role name happens to match a tenant role.
    return TENANT_ROLE_NAMES.has(name) ? name : null;
  }

  private hasDatabaseRole(actual: string | undefined, requested: string): boolean {
    const role = actual === 'organization_admin' ? 'admin' : actual;
    if (!['owner', 'admin', 'member', 'accountant', 'viewer'].includes(role ?? '')) return false;
    if (['user', 'plainledger_user', 'viewer'].includes(requested)) return true;
    if (requested === 'owner') return role === 'owner';
    if (requested === 'admin' || requested === 'organization_admin')
      return role === 'owner' || role === 'admin';
    if (requested === 'member' || requested === 'accountant') return role !== 'viewer';
    return false;
  }

  private hasSignedRole(user: VerifiedRoleUser, requested: string): boolean {
    const realmRoles = this.stringRoles(user.realm_access?.roles ?? user.roles);
    if (requested.startsWith('realm:')) return realmRoles.includes(requested.slice(6));
    const separator = requested.indexOf(':');
    if (separator >= 0) {
      const clientId = requested.slice(0, separator);
      const role = requested.slice(separator + 1);
      if (
        !clientId ||
        !role ||
        !user.resource_access ||
        !Object.prototype.hasOwnProperty.call(user.resource_access, clientId)
      )
        return false;
      return this.stringRoles(user.resource_access[clientId]?.roles).includes(role);
    }
    if (PLATFORM_ROLES.has(requested)) return realmRoles.includes(requested);
    // Legacy decorators use bare realm names as well as bare API client roles.
    const clientId = this.config.get<string>('KEYCLOAK_CLIENT_ID') || 'plainledger-api';
    const clientRoles =
      user.resource_access && Object.prototype.hasOwnProperty.call(user.resource_access, clientId)
        ? this.stringRoles(user.resource_access[clientId]?.roles)
        : [];
    return realmRoles.includes(requested) || clientRoles.includes(requested);
  }

  private stringRoles(value: unknown): string[] {
    return Array.isArray(value) && value.every((role) => typeof role === 'string') ? value : [];
  }

  private organizationClaim(user: VerifiedRoleUser): string | null {
    const values = [
      user.organizationId,
      user.organization,
      user.organization_id,
      user.org_id,
    ].filter((value) => value !== undefined && value !== null);
    if (
      !values.length ||
      values.some(
        (value) =>
          typeof value !== 'string' ||
          !value ||
          value.trim() !== value ||
          value.length > 100 ||
          value !== values[0],
      )
    )
      return null;
    return values[0] as string;
  }

  private matchesRequestedOrganization(
    request: RoleRequest,
    graphqlArgs: Record<string, unknown> | undefined,
    claim: string,
    profile: UserProfileEntity,
  ): boolean {
    const selected = request.headers?.['x-organization-id'];
    if (selected !== undefined && selected !== claim) return false;
    const allowed = [profile.organizationId, profile.organization!.tenantId];
    for (const source of [request.params, request.query, request.body, graphqlArgs]) {
      if (!source) continue;
      const sources = [source];
      if (source.input && typeof source.input === 'object' && !Array.isArray(source.input)) {
        sources.push(source.input as Record<string, unknown>);
      }
      for (const selectorSource of sources) {
        for (const field of ORGANIZATION_SELECTORS) {
          const value = selectorSource[field];
          if (value !== undefined && (typeof value !== 'string' || !allowed.includes(value)))
            return false;
        }
      }
    }
    return true;
  }
}
