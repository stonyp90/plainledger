import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID, createHash } from 'node:crypto';
import { DataSource, EntityManager, FindOperator } from 'typeorm';
import {
  OrganizationMembershipService,
  OrganizationActor,
} from '../organization-membership.service';
import { OrganizationEntity } from '@infrastructure/persistence/postgres/entities/organization.entity';
import { OrganizationFeaturesEntity } from '@infrastructure/persistence/postgres/entities/organization-features.entity';
import { UserProfileEntity } from '@infrastructure/persistence/postgres/entities/user-profile.entity';
import { SubscriptionPlanEntity } from '@infrastructure/persistence/postgres/entities/subscription-plan.entity';
import { OrganizationInvitationEntity } from '@infrastructure/persistence/postgres/entities/organization-invitation.entity';
import { SESAdapter } from '@infrastructure/adapters/email/ses/ses.adapter';
import { KeycloakAdminService } from '@infrastructure/auth/keycloak-admin.service';

jest.mock('@infrastructure/adapters/email/ses/ses.adapter', () => ({ SESAdapter: class {} }));
jest.mock('@infrastructure/auth/keycloak-admin.service', () => ({
  KeycloakAdminService: class {},
}));

type Entity = Record<string, any>;
type Target = new () => any;

/** Transactional repository double; SQL locking is also asserted, not simulated. */
function memoryDatabase() {
  const tables = new Map<Target, Entity[]>();
  const repos = new Map<Target, any>();
  const rows = (target: Target) => tables.get(target) ?? [];
  const clone = <T>(value: T): T => structuredClone(value);
  function matches(row: Entity, where: any): boolean {
    if (!where) return true;
    if (Array.isArray(where)) return where.some((part) => matches(row, part));
    return Object.entries(where).every(([key, value]) => {
      if (value instanceof FindOperator) {
        if (value.type === 'moreThan') return row[key] > value.value;
        throw new Error(`Unsupported test operator: ${value.type}`);
      }
      if (value === undefined)
        throw new Error('Undefined query scope must never reach a repository');
      return row[key] === value;
    });
  }
  function repository(target: Target) {
    if (repos.has(target)) return repos.get(target);
    const repository = {
      create: jest.fn((value: Entity) => ({ ...value })),
      findOne: jest.fn(async (options: any) =>
        clone(
          rows(target).find(
            (row) => (options.withDeleted || !row.deletedAt) && matches(row, options.where),
          ) ?? null,
        ),
      ),
      find: jest.fn(async (options: any = {}) =>
        clone(
          rows(target)
            .filter((row) => (options.withDeleted || !row.deletedAt) && matches(row, options.where))
            .slice(0, options.take),
        ),
      ),
      count: jest.fn(
        async (options: any) =>
          rows(target).filter((row) => !row.deletedAt && matches(row, options.where)).length,
      ),
      save: jest.fn(async (input: Entity) => {
        const defaults =
          target === UserProfileEntity
            ? {
                role: 'viewer',
                isActive: true,
                firstName: 'Test',
                lastName: 'User',
                emailVerified: false,
              }
            : target === OrganizationEntity
              ? { fiscalYearEndMonth: 12, currency: 'CAD', subscriptionPlanId: 'free' }
              : target === OrganizationInvitationEntity
                ? { status: 'pending', deliveryStatus: 'unsent' }
                : {};
        const existing = rows(target).find((candidate) => candidate.id === input.id);
        const saved = {
          ...defaults,
          id: randomUUID(),
          createdAt: new Date(),
          ...existing,
          ...input,
          updatedAt: new Date(),
        };
        tables.set(target, [
          ...rows(target).filter((candidate) => candidate.id !== saved.id),
          clone(saved),
        ]);
        return clone(saved);
      }),
      update: jest.fn(async (where: Entity, changes: Entity) => {
        let affected = 0;
        tables.set(
          target,
          rows(target).map((row) => {
            if (!matches(row, where)) return row;
            affected++;
            return { ...row, ...clone(changes) };
          }),
        );
        return { affected };
      }),
    };
    repos.set(target, repository);
    return repository;
  }
  const manager = { getRepository: repository, query: jest.fn(async () => []) };
  const transaction = jest.fn(async (work: (manager: EntityManager) => Promise<unknown>) => {
    const snapshot = new Map(
      [...tables.entries()].map(([target, records]) => [target, clone(records)]),
    );
    try {
      return await work(manager as unknown as EntityManager);
    } catch (error) {
      tables.clear();
      for (const [target, records] of snapshot) tables.set(target, records);
      throw error;
    }
  });
  return {
    rows,
    repository,
    manager,
    transaction,
    source: { manager, transaction, getRepository: repository } as unknown as DataSource,
    seed: (target: Target, records: Entity[]) => tables.set(target, clone(records)),
  };
}

const ORG_ID = '11111111-1111-4111-8111-111111111111';
const FOREIGN_ID = '22222222-2222-4222-8222-222222222222';
const TENANT = 'acme-ledger';
const owner: OrganizationActor = {
  sub: 'owner-id',
  email: 'owner@example.test',
  emailVerified: true,
  organizationId: TENANT,
  name: 'Original Owner',
  roles: ['owner'],
};
const organization = {
  id: ORG_ID,
  tenantId: TENANT,
  name: 'Acme Ledger',
  currency: 'CAD',
  fiscalYearEndMonth: 12,
  subscriptionPlanId: 'professional',
  createdAt: new Date(),
};
const profile = (id: string, role = 'viewer', organizationId = ORG_ID) => ({
  id,
  email: `${id}@example.test`,
  firstName: 'Test',
  lastName: id,
  organizationId,
  role,
  isActive: true,
  emailVerified: true,
  createdAt: new Date(),
});

describe('OrganizationMembershipService', () => {
  let db: ReturnType<typeof memoryDatabase>;
  let settings: Record<string, string>;
  let sendEmail: jest.Mock;
  let updateUserAttributes: jest.Mock;
  let service: OrganizationMembershipService;

  async function invite(email = 'invitee@example.test', role = 'viewer') {
    const result = await service.inviteMember(owner, TENANT, email, role);
    const token = new URLSearchParams(new URL(result.inviteUrl).hash.slice(1)).get('token')!;
    return { result, token };
  }

  beforeEach(() => {
    db = memoryDatabase();
    settings = { WEB_URL: 'https://plainledger.example', NODE_ENV: 'test' };
    sendEmail = jest.fn().mockResolvedValue({ success: true, messageId: 'provider-id' });
    updateUserAttributes = jest.fn().mockResolvedValue(undefined);
    service = new OrganizationMembershipService(
      db.source,
      { get: (key: string) => settings[key] } as ConfigService,
      { sendEmail, isAvailable: () => true } as unknown as SESAdapter,
      { updateUserAttributes } as unknown as KeycloakAdminService,
    );
    db.seed(OrganizationEntity, [organization]);
    db.seed(UserProfileEntity, [{ ...profile(owner.sub, 'owner'), email: owner.email }]);
    db.seed(SubscriptionPlanEntity, [
      { id: 'professional', isActive: true, limits: { users: 10 } },
      { id: 'free', isActive: true, limits: { users: 1 } },
    ]);
  });

  describe('transactional owner creation', () => {
    const newcomer = {
      ...owner,
      sub: 'new-user',
      email: 'new@example.test',
      organizationId: 'new-ledger',
      name: 'New Owner',
    };

    it('binds the new organization and an active owner with a single commit', async () => {
      const beforeCommit = jest.fn(async (created) => {
        expect(
          db.rows(UserProfileEntity).find((row) => row.id === newcomer.sub)?.organizationId,
        ).toBe(created.id);
      });
      const created = await service.createOwnedOrganization(
        newcomer,
        { tenantId: 'new-ledger', name: 'New Ledger' },
        beforeCommit,
      );
      const saved = db.rows(UserProfileEntity).find((row) => row.id === newcomer.sub)!;
      expect(saved).toMatchObject({
        organizationId: created.id,
        role: 'owner',
        isActive: true,
        firstName: 'New',
        lastName: 'Owner',
      });
      expect(saved.featureFlags.demoMode).toBe(false);
      expect(db.rows(OrganizationFeaturesEntity)).toEqual([expect.objectContaining({
        organizationId: created.id, updatedBy: newcomer.sub, overrides: {},
        analytics: {
          plainledger: { enabled: true, visibleToRoles: ['owner', 'admin', 'member', 'accountant', 'viewer', 'user'] },
          powerbi: { enabled: false, visibleToRoles: ['owner', 'admin'] },
        },
      })]);
      expect(beforeCommit).toHaveBeenCalledTimes(1);
      expect(db.manager.query).toHaveBeenCalledWith(
        'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
        ['organization-membership:new-user'],
      );
    });

    it('rolls back the new organization and profile when Keycloak claim assignment fails', async () => {
      await expect(
        service.createOwnedOrganization(
          newcomer,
          { tenantId: 'new-ledger', name: 'New Ledger' },
          async () => {
            throw new Error('Keycloak unavailable');
          },
        ),
      ).rejects.toThrow('Keycloak unavailable');
      expect(db.rows(OrganizationEntity)).toHaveLength(1);
      expect(db.rows(UserProfileEntity)).toHaveLength(1);
      expect(db.rows(OrganizationFeaturesEntity)).toHaveLength(0);
    });

    it('rejects creating another tenant even with an owner realm claim', async () => {
      await expect(
        service.createOwnedOrganization(newcomer, { tenantId: 'victim-ledger', name: 'Victim' }),
      ).rejects.toThrow(ForbiddenException);
      expect(db.transaction).not.toHaveBeenCalled();
    });

    it('rejects silently moving an existing profile into a newly created organization', async () => {
      await expect(
        service.createOwnedOrganization(
          { ...owner, organizationId: 'other-ledger' },
          { tenantId: 'other-ledger', name: 'Other Ledger' },
        ),
      ).rejects.toThrow(ConflictException);
      expect(db.rows(OrganizationEntity)).toHaveLength(1);
    });

    it.each([
      { tenantId: 'Bad Slug', name: 'Valid' },
      { tenantId: 'new-ledger', name: ' ' },
      { tenantId: 'new-ledger', name: 'Valid', fiscalYearEndMonth: 1.5 },
      { tenantId: 'new-ledger', name: 'Valid', currency: 'usd' },
    ])('rejects invalid organization input %# without persisting anything', async (input) => {
      await expect(service.createOwnedOrganization(newcomer, input)).rejects.toThrow(
        BadRequestException,
      );
      expect(db.transaction).not.toHaveBeenCalled();
    });

    it('maps uniqueness races to a conflict without pretending the create succeeded', async () => {
      db.repository(OrganizationEntity).save.mockRejectedValueOnce({ code: '23505' });
      await expect(
        service.createOwnedOrganization(newcomer, { tenantId: 'new-ledger', name: 'New Ledger' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('live membership authorization', () => {
    it('scopes directory output to the selected organization and omits private profile settings', async () => {
      db.seed(UserProfileEntity, [
        { ...profile(owner.sub, 'owner'), email: owner.email, featureFlags: { secret: true } },
        profile('own-member'),
        profile('foreign-member', 'owner', FOREIGN_ID),
      ]);
      const members = await service.getMembers(owner, TENANT);
      expect(members.map((member) => member.id)).toEqual([owner.sub, 'own-member']);
      expect(members[0]).not.toHaveProperty('featureFlags');
      expect(db.repository(OrganizationEntity).findOne).toHaveBeenCalledWith(
        expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
      );
    });

    it.each(['viewer', 'member'])(
      'does not trust a stale owner JWT when the DB role is "%s"',
      async (role) => {
        db.seed(UserProfileEntity, [{ ...profile(owner.sub, role), email: owner.email }]);
        await expect(service.getMembers(owner, TENANT)).rejects.toThrow(ForbiddenException);
        await expect(
          service.inviteMember(owner, TENANT, 'person@example.test', 'viewer'),
        ).rejects.toThrow(ForbiddenException);
      },
    );

    it('rejects inactive membership immediately', async () => {
      db.seed(UserProfileEntity, [{ ...profile(owner.sub, 'owner'), isActive: false }]);
      await expect(service.getMembers(owner, TENANT)).rejects.toThrow(ForbiddenException);
    });

    it('requires the verified tenant claim as well as database membership', async () => {
      await expect(
        service.getMembers({ ...owner, organizationId: 'different-tenant' }, TENANT),
      ).rejects.toThrow(ForbiddenException);
    });

    it('never accepts an absent subject that could omit a TypeORM query filter', async () => {
      await expect(
        service.getMembers({ ...owner, sub: undefined } as unknown as OrganizationActor, TENANT),
      ).rejects.toThrow(ForbiddenException);
      expect(db.transaction).not.toHaveBeenCalled();
    });

    it('prevents the final active owner from being demoted or removed', async () => {
      await expect(service.updateMemberRole(owner, TENANT, owner.sub, 'viewer')).rejects.toThrow(
        'last active owner',
      );
      await expect(service.removeMember(owner, TENANT, owner.sub)).rejects.toThrow(
        'last active owner',
      );
      expect(db.rows(UserProfileEntity)[0]).toMatchObject({ role: 'owner', isActive: true });
    });

    it('allows an owner to leave after another active owner exists', async () => {
      db.seed(UserProfileEntity, [
        { ...profile(owner.sub, 'owner'), email: owner.email },
        profile('second-owner', 'owner'),
      ]);
      await service.removeMember(owner, TENANT, owner.sub);
      expect(db.rows(UserProfileEntity).find((row) => row.id === owner.sub)?.isActive).toBe(false);
      await expect(service.getMembers(owner, TENANT)).rejects.toThrow(ForbiddenException);
    });

    it('prevents an administrator from promoting themselves or changing another administrator', async () => {
      db.seed(UserProfileEntity, [
        { ...profile(owner.sub, 'admin'), email: owner.email },
        profile('other-admin', 'admin'),
      ]);
      await expect(service.updateMemberRole(owner, TENANT, owner.sub, 'owner')).rejects.toThrow(
        'promote themselves',
      );
      await expect(
        service.updateMemberRole(owner, TENANT, 'other-admin', 'viewer'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows an administrator to manage ordinary members but not grant administrator invitations', async () => {
      db.seed(UserProfileEntity, [
        { ...profile(owner.sub, 'admin'), email: owner.email },
        profile('member', 'viewer'),
      ]);
      await service.updateMemberRole(owner, TENANT, 'member', 'member');
      expect(db.rows(UserProfileEntity).find((row) => row.id === 'member')?.role).toBe('member');
      await expect(invite('new@example.test', 'admin')).rejects.toThrow(ForbiddenException);
    });

    it('rejects a foreign member ID rather than changing another organization', async () => {
      db.seed(UserProfileEntity, [
        { ...profile(owner.sub, 'owner'), email: owner.email },
        profile('foreign', 'viewer', FOREIGN_ID),
      ]);
      await expect(service.updateMemberRole(owner, TENANT, 'foreign', 'admin')).rejects.toThrow(
        'not found',
      );
      expect(db.rows(UserProfileEntity).find((row) => row.id === 'foreign')?.role).toBe('viewer');
    });

    it('rejects an oversized directory instead of silently returning only part of it', async () => {
      db.seed(UserProfileEntity, [
        { ...profile(owner.sub, 'owner'), email: owner.email },
        ...Array.from({ length: 5000 }, (_, index) => profile(`member-${index}`)),
      ]);
      await expect(service.getMembers(owner, TENANT)).rejects.toThrow('5000-row');
    });
  });

  describe('durable invitation links and delivery truth', () => {
    it('stores only a cryptographic token hash and returns an unsent one-time fragment link', async () => {
      const { result, token } = await invite();
      expect(result.deliveryStatus).toBe('unsent');
      expect(new URL(result.inviteUrl).search).toBe('');
      expect(new URL(result.inviteUrl).pathname).toBe('/join');
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      const stored = db.rows(OrganizationInvitationEntity)[0];
      expect(stored.tokenHash).toBe(createHash('sha256').update(token).digest('hex'));
      expect(JSON.stringify(stored)).not.toContain(token);
      expect(result).not.toHaveProperty('tokenHash');
      expect(sendEmail).not.toHaveBeenCalled();
      const listing = await service.getInvitations(owner, TENANT);
      expect(listing[0]).not.toHaveProperty('inviteUrl');
      expect(listing[0]).not.toHaveProperty('tokenHash');
    });

    it('normalizes email once and rejects duplicate pending invitations', async () => {
      const first = await invite(' Person@Example.test ');
      expect(first.result.email).toBe('person@example.test');
      await expect(invite('person@example.test')).rejects.toThrow(
        'pending invitation already exists',
      );
      expect(db.rows(OrganizationInvitationEntity)).toHaveLength(1);
    });

    it('does not allow invitations to grant owner privileges', async () => {
      await expect(invite('person@example.test', 'owner')).rejects.toThrow(BadRequestException);
      expect(db.rows(OrganizationInvitationEntity)).toHaveLength(0);
    });

    it('honors a saved maxUsers override while reserving invitation seats', async () => {
      db.seed(OrganizationFeaturesEntity, [{ organizationId: ORG_ID, overrides: { maxUsers: 2 } }]);
      await service.inviteMember(owner, TENANT, 'first@example.test', 'viewer');
      await expect(service.inviteMember(owner, TENANT, 'second@example.test', 'viewer')).rejects.toThrow('user limit');
    });

    it('treats zero seats as forbidden capacity and not missing configuration', async () => {
      db.seed(OrganizationFeaturesEntity, [{ organizationId: ORG_ID, overrides: { maxUsers: 0 } }]);
      await expect(service.inviteMember(owner, TENANT, 'first@example.test', 'viewer')).rejects.toThrow(ForbiddenException);
    });

    it('allows an explicit unlimited user override over the base plan', async () => {
      db.seed(SubscriptionPlanEntity, [{ id: 'professional', isActive: true, limits: { users: 1 } }]);
      db.seed(OrganizationFeaturesEntity, [{ organizationId: ORG_ID, overrides: { maxUsers: -1 } }]);
      expect(await service.inviteMember(owner, TENANT, 'first@example.test', 'viewer')).toHaveProperty('inviteUrl');
    });

    it('reserves pending invitation seats and refuses to exceed the plan limit', async () => {
      db.seed(SubscriptionPlanEntity, [
        { id: 'professional', isActive: true, limits: { users: 2 } },
      ]);
      await invite('first@example.test');
      await expect(invite('second@example.test')).rejects.toThrow('user limit');
      expect(db.rows(OrganizationInvitationEntity)).toHaveLength(1);
    });

    it('marks email as queued only with a provider message ID and escapes organization HTML', async () => {
      settings.TEAM_INVITATIONS_EMAIL_ENABLED = 'true';
      db.seed(OrganizationEntity, [{ ...organization, name: '<img src=x onerror="bad()">' }]);
      const { result } = await invite();
      expect(result.deliveryStatus).toBe('queued');
      expect(result.deliveryMessage).toContain('Inbox delivery is not yet confirmed');
      expect(sendEmail.mock.calls[0][0].html).toContain('&lt;img');
      expect(sendEmail.mock.calls[0][0].html).not.toContain('<img');
      expect(db.rows(OrganizationInvitationEntity)[0].deliveryStatus).toBe('queued');
    });

    it.each([{ success: false }, { success: true }])(
      'retains a copyable failed invitation when delivery is not confirmed %#',
      async (result) => {
        settings.TEAM_INVITATIONS_EMAIL_ENABLED = 'true';
        sendEmail.mockResolvedValue(result);
        const created = await invite();
        expect(created.result.deliveryStatus).toBe('failed');
        expect(created.result.inviteUrl).toContain('#token=');
        expect(db.rows(OrganizationInvitationEntity)[0].deliveryStatus).toBe('failed');
        await expect(service.previewInvitation(created.token)).resolves.toMatchObject({
          email: 'invitee@example.test',
        });
      },
    );

    it('rotates resend tokens so the old link cannot be accepted', async () => {
      const first = await invite();
      const second = await service.resendInvitation(owner, TENANT, first.result.id);
      expect(second.inviteUrl).not.toBe(first.result.inviteUrl);
      await expect(service.previewInvitation(first.token)).rejects.toThrow('replaced');
      const token = new URLSearchParams(new URL(second.inviteUrl).hash.slice(1)).get('token')!;
      await expect(service.previewInvitation(token)).resolves.toMatchObject({ tenantId: TENANT });
    });

    it('revokes a pending invitation permanently and rejects resend', async () => {
      const { result, token } = await invite();
      await service.revokeInvitation(owner, TENANT, result.id);
      await expect(service.previewInvitation(token)).rejects.toThrow(GoneException);
      await expect(service.resendInvitation(owner, TENANT, result.id)).rejects.toThrow(
        ConflictException,
      );
    });

    it('keeps list state honest when an invitation has expired', async () => {
      const { token } = await invite();
      db.rows(OrganizationInvitationEntity)[0].expiresAt = new Date(0);
      await expect(service.previewInvitation(token)).rejects.toThrow(GoneException);
      expect((await service.getInvitations(owner, TENANT))[0].status).toBe('expired');
    });
  });

  describe('one-time invitation acceptance', () => {
    const invitee = {
      ...owner,
      sub: 'invited-user',
      email: 'invitee@example.test',
      organizationId: 'unbound-claim',
      name: 'Invited Person',
    };

    it('validates signup token/email without consuming the invitation', async () => {
      const { token } = await invite('invitee@example.test', 'member');
      await expect(service.getInvitationForSignup(token, 'Invitee@Example.test')).resolves.toEqual({
        tenantId: TENANT,
        role: 'member',
        organizationName: 'Acme Ledger',
      });
      expect(db.rows(OrganizationInvitationEntity)[0].status).toBe('pending');
      await expect(service.getInvitationForSignup(token, 'different@example.test')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('creates an invited signup directly in the target organization without another personal tenant', async () => {
      const { token } = await invite('invitee@example.test', 'member');
      const commitHook = jest.fn().mockResolvedValue(undefined);
      const accepted = await service.acceptInvitationForNewUser(
        token,
        { ...invitee, emailVerified: false },
        commitHook,
      );
      expect(accepted.id).toBe(ORG_ID);
      expect(db.rows(OrganizationEntity)).toHaveLength(1);
      expect(db.rows(UserProfileEntity).find((row) => row.id === invitee.sub)).toMatchObject({
        organizationId: ORG_ID,
        role: 'member',
        emailVerified: false,
        registrationSource: 'invite',
      });
      expect(commitHook).toHaveBeenCalledWith(expect.objectContaining({ tenantId: TENANT }));
      expect(db.rows(OrganizationInvitationEntity)[0]).toMatchObject({
        status: 'accepted',
        acceptedBy: invitee.sub,
      });
      await expect(service.previewInvitation(token)).rejects.toThrow(GoneException);
      await expect(service.acceptInvitationForNewUser(token, invitee)).rejects.toThrow(
        GoneException,
      );
    });

    it('requires verified email for authenticated acceptance even with the correct token', async () => {
      const { token } = await invite();
      await expect(
        service.acceptInvitationForExistingUser(token, { ...invitee, emailVerified: false }),
      ).rejects.toThrow('Verify your account email');
      expect(db.rows(OrganizationInvitationEntity)[0].status).toBe('pending');
    });

    it('rejects an authenticated account whose verified email does not match', async () => {
      const { token } = await invite();
      await expect(
        service.acceptInvitationForExistingUser(token, {
          ...invitee,
          email: 'attacker@example.test',
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(updateUserAttributes).not.toHaveBeenCalled();
    });

    it('binds an unbound verified account and updates its Keycloak tenant slug', async () => {
      const { token } = await invite();
      const accepted = await service.acceptInvitationForExistingUser(token, invitee);
      expect(accepted.tenantId).toBe(TENANT);
      expect(updateUserAttributes).toHaveBeenCalledWith({
        userId: invitee.sub,
        attributes: {
          organization: [TENANT],
          organizationName: ['Acme Ledger'],
          demoMode: ['false'],
        },
      });
      expect(db.rows(UserProfileEntity).find((row) => row.id === invitee.sub)?.role).toBe('viewer');
    });

    it('does not transfer an existing account away from another organization', async () => {
      const { token } = await invite();
      db.seed(UserProfileEntity, [
        ...db.rows(UserProfileEntity),
        { ...profile(invitee.sub, 'owner', FOREIGN_ID), email: invitee.email },
      ]);
      await expect(service.acceptInvitationForExistingUser(token, invitee)).rejects.toThrow(
        'already belongs to another organization',
      );
      expect(db.rows(UserProfileEntity).find((row) => row.id === invitee.sub)?.organizationId).toBe(
        FOREIGN_ID,
      );
      expect(db.rows(OrganizationInvitationEntity)[0].status).toBe('pending');
      expect(updateUserAttributes).not.toHaveBeenCalled();
    });

    it('rolls back both membership and token consumption if identity update fails', async () => {
      const { token } = await invite();
      updateUserAttributes.mockRejectedValue(new Error('Keycloak unavailable'));
      await expect(service.acceptInvitationForExistingUser(token, invitee)).rejects.toThrow(
        'Keycloak unavailable',
      );
      expect(db.rows(UserProfileEntity).find((row) => row.id === invitee.sub)).toBeUndefined();
      expect(db.rows(OrganizationInvitationEntity)[0].status).toBe('pending');
    });

    it('rejects a pending administrator invite if its issuer has lost owner privileges', async () => {
      const { token } = await invite('invitee@example.test', 'admin');
      db.rows(UserProfileEntity)[0].role = 'admin';
      await expect(service.acceptInvitationForExistingUser(token, invitee)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('rechecks the plan capacity at acceptance after a downgrade', async () => {
      const { token } = await invite();
      db.seed(SubscriptionPlanEntity, [
        { id: 'professional', isActive: true, limits: { users: 1 } },
      ]);
      await expect(service.acceptInvitationForExistingUser(token, invitee)).rejects.toThrow(
        'user limit',
      );
      expect(db.rows(OrganizationInvitationEntity)[0].status).toBe('pending');
    });

    it.each(['', 'short', 'x'.repeat(44), 'x'.repeat(42) + '/'])(
      'rejects malformed token %s before querying storage',
      async (token) => {
        await expect(service.previewInvitation(token)).rejects.toThrow(BadRequestException);
        expect(db.repository(OrganizationInvitationEntity).findOne).not.toHaveBeenCalled();
      },
    );
  });
});
