import { ExecutionContext, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Repository } from 'typeorm';
import { UserProfileEntity } from '@infrastructure/persistence/postgres/entities/user-profile.entity';
import { DatabaseRoleGuard } from '../database-role.guard';

const ORG_ID = '11111111-1111-4111-8111-111111111111';
const TENANT = 'acme-ledger';

describe('DatabaseRoleGuard', () => {
  let guard: DatabaseRoleGuard;
  let findOne: jest.Mock;
  let handler: () => void;
  let controller: new () => object;
  let profile: UserProfileEntity;
  let user: Record<string, any>;

  function context(roles?: string[], mode?: string, overrides: Record<string, any> = {}) {
    if (roles !== undefined)
      Reflect.defineMetadata('roles', { roles, ...(mode ? { mode } : {}) }, handler);
    const request = { user, headers: {}, ...overrides };
    const execution = {
      getClass: () => controller,
      getHandler: () => handler,
      getType: () => 'http',
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    return { request, execution };
  }

  beforeEach(() => {
    handler = () => undefined;
    controller = class TestController {};
    profile = {
      id: 'member-id',
      role: 'viewer',
      isActive: true,
      organizationId: ORG_ID,
      organization: { id: ORG_ID, tenantId: TENANT },
    } as UserProfileEntity;
    user = {
      sub: 'member-id',
      organization: TENANT,
      realm_access: { roles: ['owner', 'admin', 'user'] },
    };
    findOne = jest.fn().mockImplementation(async () => profile);
    guard = new DatabaseRoleGuard(
      new Reflector(),
      new ConfigService({ KEYCLOAK_CLIENT_ID: 'plainledger-api' }),
      { findOne } as unknown as Repository<UserProfileEntity>,
    );
  });

  afterEach(() => jest.restoreAllMocks());

  it('allows routes without role metadata without duplicating authentication', async () => {
    await expect(
      guard.canActivate(context(undefined, undefined, { user: undefined }).execution),
    ).resolves.toBe(true);
    expect(findOne).not.toHaveBeenCalled();
  });

  it('allows explicit public metadata even if role metadata is present', async () => {
    Reflect.defineMetadata('isPublic', true, handler);
    await expect(
      guard.canActivate(context(['owner'], undefined, { user: undefined }).execution),
    ).resolves.toBe(true);
    expect(findOne).not.toHaveBeenCalled();
  });

  it('keeps class-level metadata precedence over handler metadata', async () => {
    Reflect.defineMetadata('roles', { roles: ['owner'] }, controller);
    await expect(guard.canActivate(context(['viewer']).execution)).resolves.toBe(false);
  });

  it.each([undefined, {}, { sub: undefined }, { sub: '' }, { sub: '   ' }])(
    'denies missing verified identity %p',
    async (identity) => {
      await expect(
        guard.canActivate(context(['viewer'], undefined, { user: identity }).execution),
      ).resolves.toBe(false);
      expect(findOne).not.toHaveBeenCalled();
    },
  );

  it('rejects stale owner/admin claims after the persisted role is demoted', async () => {
    await expect(guard.canActivate(context(['owner', 'admin']).execution)).resolves.toBe(false);
    expect(findOne).toHaveBeenCalledWith({
      where: { id: 'member-id', isActive: true },
      relations: ['organization'],
    });
  });

  it('grants a persisted promotion immediately with the same old viewer token', async () => {
    user.realm_access.roles = ['viewer'];
    const request = context(['admin']);
    await expect(guard.canActivate(request.execution)).resolves.toBe(false);
    profile.role = 'admin';
    await expect(guard.canActivate(request.execution)).resolves.toBe(true);
    profile.role = 'viewer';
    await expect(guard.canActivate(request.execution)).resolves.toBe(false);
    expect(findOne).toHaveBeenCalledTimes(3);
  });

  it.each(['user', 'plainledger_user', 'viewer', 'realm:user'])(
    'treats %s as a generic active member role',
    async (role) => {
      user.realm_access.roles = [];
      await expect(guard.canActivate(context([role]).execution)).resolves.toBe(true);
    },
  );

  it('lets owner inherit tenant administration without inheriting platform authority', async () => {
    profile.role = 'owner';
    await expect(
      guard.canActivate(
        context(['admin', 'organization_admin', 'viewer', 'member'], 'all').execution,
      ),
    ).resolves.toBe(true);
    await expect(guard.canActivate(context(['platform_admin']).execution)).resolves.toBe(false);
  });

  it('uses DB authority for realm-qualified tenant roles too', async () => {
    await expect(guard.canActivate(context(['realm:admin']).execution)).resolves.toBe(false);
    profile.role = 'admin';
    user.realm_access.roles = [];
    await expect(guard.canActivate(context(['realm:admin']).execution)).resolves.toBe(true);
  });

  it('respects explicit any and all modes for mixed tenant and signed platform roles', async () => {
    profile.role = 'owner';
    await expect(
      guard.canActivate(context(['owner', 'platform_admin'], 'any').execution),
    ).resolves.toBe(true);
    await expect(
      guard.canActivate(context(['owner', 'platform_admin'], 'all').execution),
    ).resolves.toBe(false);
    user.realm_access.roles.push('platform_admin');
    await expect(
      guard.canActivate(context(['owner', 'platform_admin'], 'all').execution),
    ).resolves.toBe(true);
  });

  it.each([
    { roles: null },
    { roles: [1] },
    { roles: [' owner'] },
    { roles: ['viewer'], mode: 'unexpected' },
  ])('fails closed on malformed role metadata %#', async (metadata) => {
    Reflect.defineMetadata('roles', metadata, controller);
    await expect(guard.canActivate(context().execution)).resolves.toBe(false);
  });

  it.each([null, { isActive: false }, { organization: undefined }, { organizationId: undefined }])(
    'rejects removed or malformed membership %#',
    async (override) => {
      findOne.mockResolvedValue(override === null ? null : { ...profile, ...override });
      await expect(guard.canActivate(context(['viewer']).execution)).resolves.toBe(false);
    },
  );

  it('rejects a deleted organization even if the user and old token remain active', async () => {
    profile.organization!.deletedAt = new Date();
    await expect(guard.canActivate(context(['viewer']).execution)).resolves.toBe(false);
  });

  it('rejects a relation whose UUID does not match the persisted membership', async () => {
    profile.organization!.id = 'different-uuid';
    await expect(guard.canActivate(context(['viewer']).execution)).resolves.toBe(false);
  });

  it.each([TENANT, ORG_ID])(
    'supports an exact verified tenant slug or organization UUID claim %s',
    async (claim) => {
      user.organization = claim;
      await expect(guard.canActivate(context(['viewer']).execution)).resolves.toBe(true);
    },
  );

  it.each(['foreign', 'acme-ledger-other', ' acme-ledger', [], undefined])(
    'rejects a mismatched or absent tenant claim %p',
    async (claim) => {
      user.organization = claim;
      await expect(guard.canActivate(context(['viewer']).execution)).resolves.toBe(false);
    },
  );

  it('rejects conflicting organization claim aliases rather than choosing one', async () => {
    user.organization_id = 'foreign';
    await expect(guard.canActivate(context(['viewer']).execution)).resolves.toBe(false);
    expect(findOne).not.toHaveBeenCalled();
  });

  it.each(['params', 'query', 'body'])(
    'checks organization selectors in %s even without a separate TenantGuard',
    async (source) => {
      await expect(
        guard.canActivate(
          context(['viewer'], undefined, { [source]: { organizationId: 'foreign' } }).execution,
        ),
      ).resolves.toBe(false);
      await expect(
        guard.canActivate(
          context(['viewer'], undefined, { [source]: { organizationId: ORG_ID } }).execution,
        ),
      ).resolves.toBe(true);
    },
  );

  it('requires header tenant selection to agree with the signed claim', async () => {
    await expect(
      guard.canActivate(
        context(['viewer'], undefined, { headers: { 'x-organization-id': 'foreign' } }).execution,
      ),
    ).resolves.toBe(false);
  });

  it('accepts the normalized verified user shape', async () => {
    user = { sub: 'member-id', organizationId: TENANT, roles: ['viewer'] };
    await expect(guard.canActivate(context(['viewer']).execution)).resolves.toBe(true);
  });

  it.each(['platform_admin', 'platform-admin', 'super-admin'])(
    'accepts signed platform role %s only when actually present',
    async (role) => {
      user.realm_access.roles = [role];
      await expect(guard.canActivate(context([role]).execution)).resolves.toBe(true);
      expect(findOne).not.toHaveBeenCalled();
      user.realm_access.roles = ['owner', 'admin'];
      await expect(guard.canActivate(context([role]).execution)).resolves.toBe(false);
    },
  );

  it('does not silently equate platform aliases absent from the signed roles', async () => {
    user.realm_access.roles = ['platform-admin'];
    await expect(guard.canActivate(context(['platform_admin']).execution)).resolves.toBe(false);
  });

  it('does not grant realm platform privilege from a similarly named client role or email', async () => {
    user.email = 'admin@example.test';
    user.resource_access = { 'plainledger-api': { roles: ['platform_admin'] } };
    await expect(guard.canActivate(context(['platform_admin']).execution)).resolves.toBe(false);
  });

  it('preserves exact client-role namespaces without treating the client admin as a tenant owner', async () => {
    user.resource_access = { 'report-worker': { roles: ['admin', 'export'] } };
    await expect(guard.canActivate(context(['report-worker:export']).execution)).resolves.toBe(
      true,
    );
    await expect(guard.canActivate(context(['other-worker:export']).execution)).resolves.toBe(
      false,
    );
    await expect(guard.canActivate(context(['owner']).execution)).resolves.toBe(false);
  });

  it('supports bare API client roles without trusting an unrelated application', async () => {
    user.resource_access = { 'plainledger-api': { roles: ['export-ledger'] } };
    await expect(guard.canActivate(context(['export-ledger']).execution)).resolves.toBe(true);
    user.resource_access = { 'another-app': { roles: ['export-ledger'] } };
    await expect(guard.canActivate(context(['export-ledger']).execution)).resolves.toBe(false);
  });

  it('reports database authorization outages instead of silently denying or granting', async () => {
    findOne.mockRejectedValue(new Error('database password/connection details'));
    await expect(guard.canActivate(context(['viewer']).execution)).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('uses the GraphQL request and validates nested organization input', async () => {
    const request = context(['viewer']);
    const args = { input: { organizationId: 'foreign' } };
    jest.spyOn(GqlExecutionContext, 'create').mockReturnValue({
      getContext: () => ({ req: request.request }),
      getArgs: () => args,
    } as unknown as GqlExecutionContext);
    const gqlExecution = {
      ...request.execution,
      getType: () => 'graphql',
    } as unknown as ExecutionContext;
    await expect(guard.canActivate(gqlExecution)).resolves.toBe(false);
    args.input.organizationId = ORG_ID;
    await expect(guard.canActivate(gqlExecution)).resolves.toBe(true);
  });
});
