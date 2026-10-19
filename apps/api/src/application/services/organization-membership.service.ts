import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import { DataSource, EntityManager, MoreThan } from 'typeorm';
import { isEmail } from 'class-validator';
import {
  CreateOrganizationRequest,
  CreateOrganizationResponse,
} from '../use-cases/create-organization.use-case';
import { OrganizationEntity } from '@infrastructure/persistence/postgres/entities/organization.entity';
import { OrganizationFeaturesEntity } from '@infrastructure/persistence/postgres/entities/organization-features.entity';
import { UserProfileEntity } from '@infrastructure/persistence/postgres/entities/user-profile.entity';
import { SubscriptionPlanEntity } from '@infrastructure/persistence/postgres/entities/subscription-plan.entity';
import {
  InvitationDeliveryStatus,
  InvitationRole,
  OrganizationInvitationEntity,
} from '@infrastructure/persistence/postgres/entities/organization-invitation.entity';
import { SESAdapter } from '@infrastructure/adapters/email/ses/ses.adapter';
import { KeycloakAdminService } from '@infrastructure/auth/keycloak-admin.service';

export interface OrganizationActor {
  sub: string;
  email: string;
  emailVerified: boolean;
  organizationId: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  roles?: string[];
}

type MemberRole = 'owner' | 'admin' | 'member' | 'viewer';
type OrganizationCommitHook = (organization: {
  id: string;
  tenantId: string;
  name: string;
}) => Promise<void>;
const ROLE_RANK: Record<MemberRole, number> = { owner: 100, admin: 50, member: 20, viewer: 0 };
const INVITATION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_LIST_ROWS = 5_000;

interface MembershipContext {
  manager: EntityManager;
  organization: OrganizationEntity;
  actorProfile: UserProfileEntity;
}

@Injectable()
export class OrganizationMembershipService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly email: SESAdapter,
    private readonly keycloak: KeycloakAdminService,
  ) {}

  /** Create the organization and its first owner together, or create neither. */
  async createOwnedOrganization(
    actor: OrganizationActor,
    dto: CreateOrganizationRequest,
    beforeCommit?: OrganizationCommitHook,
  ): Promise<CreateOrganizationResponse> {
    this.validateActor(actor);
    this.validateOrganizationInput(dto);
    if (actor.organizationId !== dto.tenantId) {
      throw new ForbiddenException(
        'You can create only the organization in your verified identity',
      );
    }
    try {
      return await this.dataSource.transaction(async (manager) => {
        await this.lockIdentity(manager, actor.sub);
        const profiles = manager.getRepository(UserProfileEntity);
        if (await profiles.findOne({ where: { id: actor.sub } })) {
          throw new ConflictException(
            'This account already has a profile; organization transfer is not automatic',
          );
        }
        if (await profiles.findOne({ where: { email: this.normalizeEmail(actor.email) } })) {
          throw new ConflictException('This email already has an account profile');
        }
        const organizations = manager.getRepository(OrganizationEntity);
        if (await organizations.findOne({ where: { tenantId: dto.tenantId }, withDeleted: true })) {
          throw new ConflictException('Organization already exists');
        }
        const organization = await organizations.save(
          organizations.create({
            tenantId: dto.tenantId,
            name: dto.name.trim(),
            legalName: dto.legalName?.trim(),
            taxNumber: dto.taxNumber?.trim(),
            fiscalYearEndMonth: dto.fiscalYearEndMonth ?? 12,
            currency: dto.currency ?? 'CAD',
            industry: dto.industry?.trim(),
            subscriptionPlanId: 'free',
            onboardingStatus: 'active',
          }),
        );
        await profiles.save(profiles.create(this.profileInput(actor, organization, 'owner')));
        const features = manager.getRepository(OrganizationFeaturesEntity);
        await features.save(features.create({
          organizationId: organization.id,
          analytics: {
            plainledger: { enabled: true, visibleToRoles: ['owner', 'admin', 'member', 'accountant', 'viewer', 'user'] },
            powerbi: { enabled: false, visibleToRoles: ['owner', 'admin'] },
          },
          overrides: {},
          updatedBy: actor.sub,
        }));
        if (beforeCommit) await beforeCommit(organization);
        return this.organizationResponse(organization);
      });
    } catch (error) {
      this.rethrowConflict(error);
    }
  }

  async getMembers(actor: OrganizationActor, tenantId: string) {
    return this.withManagement(actor, tenantId, async ({ manager, organization }) => {
      const profiles = await manager.getRepository(UserProfileEntity).find({
        where: { organizationId: organization.id },
        order: { createdAt: 'ASC', id: 'ASC' },
        take: MAX_LIST_ROWS + 1,
      });
      this.checkListSize(profiles.length);
      return profiles.map((profile) => this.memberResponse(profile));
    });
  }

  async updateMemberRole(
    actor: OrganizationActor,
    tenantId: string,
    memberId: string,
    role: string,
  ) {
    this.validateMemberId(memberId);
    this.validateRole(role);
    return this.withManagement(actor, tenantId, async ({ manager, organization, actorProfile }) => {
      const profiles = manager.getRepository(UserProfileEntity);
      const target = await profiles.findOne({
        where: { id: memberId, organizationId: organization.id, isActive: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!target) throw new NotFoundException('Active organization member not found');
      this.assertCanChangeMember(actorProfile, target, role);
      if (target.role === 'owner' && role !== 'owner') {
        await this.requireAnotherOwner(manager, organization.id);
      }
      target.role = role;
      await profiles.save(target);
      return this.memberResponse(target);
    });
  }

  async removeMember(actor: OrganizationActor, tenantId: string, memberId: string): Promise<void> {
    this.validateMemberId(memberId);
    await this.withManagement(actor, tenantId, async ({ manager, organization, actorProfile }) => {
      const profiles = manager.getRepository(UserProfileEntity);
      const target = await profiles.findOne({
        where: { id: memberId, organizationId: organization.id, isActive: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!target) throw new NotFoundException('Active organization member not found');
      this.assertCanChangeMember(actorProfile, target);
      if (target.role === 'owner') await this.requireAnotherOwner(manager, organization.id);
      // Retain the membership audit trail. TenantGuard checks isActive on every call.
      target.isActive = false;
      await profiles.save(target);
    });
  }

  async getInvitations(actor: OrganizationActor, tenantId: string) {
    return this.withManagement(actor, tenantId, async ({ manager, organization }) => {
      const invitations = await manager.getRepository(OrganizationInvitationEntity).find({
        where: { organizationId: organization.id },
        order: { createdAt: 'DESC', id: 'ASC' },
        take: MAX_LIST_ROWS + 1,
      });
      this.checkListSize(invitations.length);
      return invitations.map((invitation) => this.invitationResponse(invitation));
    });
  }

  async inviteMember(actor: OrganizationActor, tenantId: string, email: string, role: string) {
    const normalizedEmail = this.normalizeEmail(email);
    this.validateInvitationRole(role);
    const token = randomBytes(32).toString('base64url');
    const inviteUrl = this.invitationUrl(token);
    const created = await this.withManagement(
      actor,
      tenantId,
      async ({ manager, organization, actorProfile }) => {
        this.assertCanInvite(actorProfile, role);
        const profiles = manager.getRepository(UserProfileEntity);
        if (
          await profiles.findOne({
            where: { email: normalizedEmail, organizationId: organization.id },
          })
        ) {
          throw new ConflictException('This email already belongs to an organization member');
        }
        const invitations = manager.getRepository(OrganizationInvitationEntity);
        const existing = await invitations.findOne({
          where: {
            organizationId: organization.id,
            email: normalizedEmail,
            status: 'pending',
          },
        });
        if (existing && existing.expiresAt.getTime() > Date.now()) {
          throw new ConflictException(
            'A pending invitation already exists; resend it to obtain a new link',
          );
        }
        if (existing) {
          existing.status = 'expired';
          await invitations.save(existing);
        }
        await this.requireAvailableSeat(manager, organization, true);
        const invitation = await invitations.save(
          invitations.create({
            organizationId: organization.id,
            email: normalizedEmail,
            role,
            tokenHash: this.hashToken(token),
            invitedBy: actor.sub,
            status: 'pending',
            deliveryStatus: 'unsent',
            expiresAt: new Date(Date.now() + INVITATION_LIFETIME_MS),
          }),
        );
        return { invitation, organization };
      },
    );
    return this.deliverInvitation(created.invitation, created.organization, inviteUrl, token);
  }

  async revokeInvitation(
    actor: OrganizationActor,
    tenantId: string,
    invitationId: string,
  ): Promise<void> {
    this.validateInvitationId(invitationId);
    await this.withManagement(actor, tenantId, async ({ manager, organization, actorProfile }) => {
      const invitations = manager.getRepository(OrganizationInvitationEntity);
      const invitation = await invitations.findOne({
        where: { id: invitationId, organizationId: organization.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!invitation) throw new NotFoundException('Organization invitation not found');
      this.assertCanInvite(actorProfile, invitation.role);
      if (invitation.status === 'accepted')
        throw new ConflictException(
          'Accepted invitations cannot be revoked; manage the member instead',
        );
      invitation.status = 'revoked';
      await invitations.save(invitation);
    });
  }

  async resendInvitation(actor: OrganizationActor, tenantId: string, invitationId: string) {
    this.validateInvitationId(invitationId);
    const token = randomBytes(32).toString('base64url');
    const inviteUrl = this.invitationUrl(token);
    const rotated = await this.withManagement(
      actor,
      tenantId,
      async ({ manager, organization, actorProfile }) => {
        const invitations = manager.getRepository(OrganizationInvitationEntity);
        const invitation = await invitations.findOne({
          where: { id: invitationId, organizationId: organization.id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!invitation) throw new NotFoundException('Organization invitation not found');
        this.assertCanInvite(actorProfile, invitation.role);
        if (invitation.status !== 'pending' && invitation.status !== 'expired') {
          throw new ConflictException('Only pending or expired invitations can be resent');
        }
        const otherPending = await invitations.findOne({
          where: {
            organizationId: organization.id,
            email: invitation.email,
            status: 'pending',
          },
        });
        if (otherPending && otherPending.id !== invitation.id) {
          throw new ConflictException('A newer pending invitation already exists');
        }
        await this.requireAvailableSeat(
          manager,
          organization,
          invitation.status === 'expired' || invitation.expiresAt.getTime() <= Date.now(),
        );
        invitation.tokenHash = this.hashToken(token);
        invitation.invitedBy = actor.sub;
        invitation.status = 'pending';
        invitation.deliveryStatus = 'unsent';
        invitation.expiresAt = new Date(Date.now() + INVITATION_LIFETIME_MS);
        await invitations.save(invitation);
        return { invitation, organization };
      },
    );
    return this.deliverInvitation(rotated.invitation, rotated.organization, inviteUrl, token);
  }

  async previewInvitation(token: string) {
    const { invitation, organization } = await this.findValidInvitation(
      this.dataSource.manager,
      token,
      false,
    );
    return {
      tenantId: organization.tenantId,
      organizationName: organization.name,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt.toISOString(),
    };
  }

  async getInvitationForSignup(
    token: string,
    email: string,
  ): Promise<{
    tenantId: string;
    role: InvitationRole;
    organizationName: string;
  }> {
    const preview = await this.previewInvitation(token);
    if (preview.email !== this.normalizeEmail(email)) {
      throw new ForbiddenException('Invitation email does not match this account');
    }
    return {
      tenantId: preview.tenantId,
      role: preview.role,
      organizationName: preview.organizationName,
    };
  }

  /** Only the trusted registration flow can accept before email verification. */
  async acceptInvitationForNewUser(
    token: string,
    actor: OrganizationActor,
    beforeCommit?: OrganizationCommitHook,
  ): Promise<CreateOrganizationResponse> {
    return this.acceptInvitation(token, actor, true, beforeCommit);
  }

  async acceptInvitationForExistingUser(
    token: string,
    actor: OrganizationActor,
  ): Promise<CreateOrganizationResponse> {
    if (actor?.emailVerified !== true) {
      throw new ForbiddenException('Verify your account email before accepting an invitation');
    }
    return this.acceptInvitation(token, actor, false, async (organization) => {
      await this.keycloak.updateUserAttributes({
        userId: actor.sub,
        attributes: {
          organization: [organization.tenantId],
          organizationName: [organization.name],
          demoMode: ['false'],
        },
      });
    });
  }

  private async acceptInvitation(
    token: string,
    actor: OrganizationActor,
    newUserOnly: boolean,
    beforeCommit?: OrganizationCommitHook,
  ): Promise<CreateOrganizationResponse> {
    this.validateActor(actor);
    return this.dataSource.transaction(async (manager) => {
      await this.lockIdentity(manager, actor.sub);
      const { invitation, organization } = await this.findValidInvitation(manager, token, true);
      if (invitation.email !== this.normalizeEmail(actor.email)) {
        throw new ForbiddenException('Invitation email does not match this account');
      }
      const profiles = manager.getRepository(UserProfileEntity);
      const existing = await profiles.findOne({
        where: { id: actor.sub },
        lock: { mode: 'pessimistic_write' },
      });
      if (existing?.organizationId && existing.organizationId !== organization.id) {
        throw new ConflictException({
          code: 'ORGANIZATION_TRANSFER_REQUIRED',
          message:
            'This account already belongs to another organization. Use a different account or arrange an explicit transfer.',
        });
      }
      if (existing && (newUserOnly || existing.organizationId || !existing.isActive)) {
        throw new ConflictException(
          'This account already has a membership; invitation acceptance cannot replace it',
        );
      }
      const duplicate = await profiles.findOne({ where: { email: invitation.email } });
      if (duplicate && duplicate.id !== actor.sub)
        throw new ConflictException('Another account profile already uses this email');
      await this.requireAvailableSeat(manager, organization, false);
      const profile =
        existing ?? profiles.create(this.profileInput(actor, organization, invitation.role));
      Object.assign(profile, {
        organizationId: organization.id,
        organizationName: organization.name,
        role: invitation.role,
        invitedBy: invitation.invitedBy,
        registrationSource: newUserOnly ? 'invite' : profile.registrationSource,
        emailVerified: actor.emailVerified,
        isActive: true,
      });
      await profiles.save(profile);
      invitation.status = 'accepted';
      invitation.acceptedAt = new Date();
      invitation.acceptedBy = actor.sub;
      await manager.getRepository(OrganizationInvitationEntity).save(invitation);
      if (beforeCommit) await beforeCommit(organization);
      return this.organizationResponse(organization);
    });
  }

  private async withManagement<T>(
    actor: OrganizationActor,
    tenantId: string,
    work: (context: MembershipContext) => Promise<T>,
  ): Promise<T> {
    this.validateActor(actor);
    if (
      typeof tenantId !== 'string' ||
      !tenantId ||
      tenantId.trim() !== tenantId ||
      tenantId.length > 100
    ) {
      throw new BadRequestException('A valid organization identifier is required');
    }
    return this.dataSource.transaction(async (manager) => {
      const where = this.isUuid(tenantId) ? [{ tenantId }, { id: tenantId }] : { tenantId };
      const organization = await manager.getRepository(OrganizationEntity).findOne({
        where,
        lock: { mode: 'pessimistic_write' },
      });
      if (
        !organization ||
        organization.deletedAt ||
        actor.organizationId !== organization.tenantId
      ) {
        throw new ForbiddenException('Active membership in the selected organization is required');
      }
      const actorProfile = await manager.getRepository(UserProfileEntity).findOne({
        where: {
          id: actor.sub,
          organizationId: organization.id,
          isActive: true,
        },
      });
      if (!actorProfile || !['owner', 'admin'].includes(actorProfile.role ?? '')) {
        throw new ForbiddenException('An active organization owner or administrator is required');
      }
      return work({ manager, organization, actorProfile });
    });
  }

  private async findValidInvitation(manager: EntityManager, token: string, lock: boolean) {
    const tokenHash = this.hashToken(token);
    const invitations = manager.getRepository(OrganizationInvitationEntity);
    let invitation = await invitations.findOne({ where: { tokenHash } });
    if (!invitation) throw new NotFoundException('Invitation link is invalid or has been replaced');
    const organization = await manager.getRepository(OrganizationEntity).findOne({
      where: { id: invitation.organizationId },
      ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });
    if (!organization || organization.deletedAt)
      throw new GoneException('This organization is no longer available');
    if (lock) {
      invitation = await invitations.findOne({
        where: { id: invitation.id, tokenHash },
        lock: { mode: 'pessimistic_write' },
      });
      if (!invitation)
        throw new NotFoundException('Invitation link is invalid or has been replaced');
    }
    if (invitation.status !== 'pending' || invitation.expiresAt.getTime() <= Date.now()) {
      throw new GoneException('Invitation has expired, been revoked, or already been accepted');
    }
    const inviter = await manager.getRepository(UserProfileEntity).findOne({
      where: {
        id: invitation.invitedBy,
        organizationId: organization.id,
        isActive: true,
      },
    });
    if (!inviter)
      throw new GoneException(
        'Invitation issuer is no longer an active organization administrator',
      );
    this.assertCanInvite(inviter, invitation.role);
    return { invitation, organization };
  }

  private async requireAvailableSeat(
    manager: EntityManager,
    organization: OrganizationEntity,
    reservePending: boolean,
  ) {
    const plan = await manager.getRepository(SubscriptionPlanEntity).findOne({
      where: {
        id: organization.subscriptionPlanId,
        isActive: true,
      },
      lock: { mode: 'pessimistic_read' },
    });
    const planLimit = plan?.limits?.users;
    if (typeof planLimit !== 'number' || !Number.isSafeInteger(planLimit) || planLimit < -1) {
      throw new ServiceUnavailableException('Organization user limits are not configured');
    }
    const features = await manager.getRepository(OrganizationFeaturesEntity).findOne({
      where: { organizationId: organization.id }, lock: { mode: 'pessimistic_read' },
    });
    const limit = features?.overrides?.maxUsers ?? planLimit;
    if (typeof limit !== 'number' || !Number.isSafeInteger(limit) || limit < -1) {
      throw new ServiceUnavailableException('Organization user limit override is not configured correctly');
    }
    if (limit === -1) return;
    if (limit === 0) throw new ForbiddenException('The organization user limit has been reached');
    const active = await manager.getRepository(UserProfileEntity).count({
      where: {
        organizationId: organization.id,
        isActive: true,
      },
    });
    const pending = reservePending
      ? await manager.getRepository(OrganizationInvitationEntity).count({
          where: {
            organizationId: organization.id,
            status: 'pending',
            expiresAt: MoreThan(new Date()),
          },
        })
      : 0;
    if (active + pending >= limit)
      throw new ForbiddenException('The organization user limit has been reached');
  }

  private async requireAnotherOwner(manager: EntityManager, organizationId: string) {
    const owners = await manager.getRepository(UserProfileEntity).count({
      where: {
        organizationId,
        role: 'owner',
        isActive: true,
      },
    });
    if (owners < 2)
      throw new ConflictException('The last active owner cannot be removed or demoted');
  }

  private assertCanChangeMember(
    actor: UserProfileEntity,
    target: UserProfileEntity,
    newRole?: MemberRole,
  ) {
    const actorRole = actor.role as MemberRole;
    const targetRole = target.role as MemberRole;
    if (actor.id === target.id && newRole && ROLE_RANK[newRole] > (ROLE_RANK[actorRole] ?? -1)) {
      throw new ForbiddenException('Members cannot promote themselves');
    }
    if (
      actorRole !== 'owner' &&
      (targetRole === 'owner' ||
        (targetRole === 'admin' && actor.id !== target.id) ||
        newRole === 'owner' ||
        newRole === 'admin')
    ) {
      throw new ForbiddenException('Only an owner can manage administrator or owner privileges');
    }
  }

  private assertCanInvite(actor: UserProfileEntity, role: string) {
    this.validateInvitationRole(role);
    if (actor.role !== 'owner' && (actor.role !== 'admin' || role === 'admin')) {
      throw new ForbiddenException(
        'Your current organization role cannot grant this invitation role',
      );
    }
  }

  private async deliverInvitation(
    invitation: OrganizationInvitationEntity,
    organization: OrganizationEntity,
    inviteUrl: string,
    token: string,
  ) {
    let deliveryStatus: InvitationDeliveryStatus = 'unsent';
    let deliveryMessage =
      'Invitation created. Email is not enabled; copy and share this one-time link.';
    if (
      this.config.get<string>('TEAM_INVITATIONS_EMAIL_ENABLED') === 'true' &&
      this.email.isAvailable()
    ) {
      let messageId: string | undefined;
      try {
        const result = await this.email.sendEmail({
          to: invitation.email,
          subject: 'Invitation to join an organization on PlainLedger',
          category: 'transactional',
          html: `<p>You are invited to join <strong>${this.escapeHtml(organization.name)}</strong> as ${invitation.role}.</p><p><a href="${this.escapeHtml(inviteUrl)}">Review and accept invitation</a></p><p>This one-time link expires in seven days. Sign in with the invited email address.</p>`,
          text: `You are invited to join ${organization.name} as ${invitation.role}. Review and accept: ${inviteUrl}\nThis one-time link expires in seven days. Sign in with the invited email address.`,
        });
        if (result.success && typeof result.messageId === 'string' && result.messageId.trim())
          messageId = result.messageId;
      } catch {
        // The durable invitation remains usable via its explicitly returned link.
      }
      deliveryStatus = messageId ? 'queued' : 'failed';
      deliveryMessage = messageId
        ? 'The email provider accepted the invitation message. Inbox delivery is not yet confirmed.'
        : 'Email could not be queued. Copy and share this one-time invitation link.';
      const update = await this.dataSource.getRepository(OrganizationInvitationEntity).update(
        {
          id: invitation.id,
          tokenHash: this.hashToken(token),
          status: 'pending',
        },
        {
          deliveryStatus,
          ...(messageId ? { emailMessageId: messageId, lastSentAt: new Date() } : {}),
        },
      );
      if (update.affected !== 1)
        throw new ConflictException(
          'Invitation changed during delivery; refresh the invitation list',
        );
    }
    return {
      ...this.invitationResponse({ ...invitation, deliveryStatus }),
      inviteUrl,
      deliveryMessage,
    };
  }

  private profileInput(
    actor: OrganizationActor,
    organization: OrganizationEntity,
    role: MemberRole,
  ) {
    const names = (actor.name ?? '').trim().split(/\s+/);
    return {
      id: actor.sub,
      email: this.normalizeEmail(actor.email),
      firstName: (actor.firstName ?? names[0] ?? 'User').slice(0, 100) || 'User',
      lastName: (actor.lastName ?? names.slice(1).join(' ')).slice(0, 100),
      organizationId: organization.id,
      organizationName: organization.name,
      industry: organization.industry,
      role,
      isActive: true,
      emailVerified: actor.emailVerified,
      registrationSource: 'web-signup',
      onboardingCompleted: false,
      featureFlags: { demoMode: false },
    };
  }

  private organizationResponse(organization: OrganizationEntity): CreateOrganizationResponse {
    return {
      id: organization.id,
      tenantId: organization.tenantId,
      name: organization.name,
      legalName: organization.legalName,
      taxNumber: organization.taxNumber,
      fiscalYearEndMonth: organization.fiscalYearEndMonth,
      currency: organization.currency,
      industry: organization.industry,
      createdAt: organization.createdAt.toISOString(),
    };
  }

  private memberResponse(profile: UserProfileEntity) {
    return {
      id: profile.id,
      userId: profile.id,
      email: profile.email,
      name: [profile.firstName, profile.lastName].filter(Boolean).join(' '),
      role: Object.prototype.hasOwnProperty.call(ROLE_RANK, profile.role ?? '')
        ? profile.role
        : 'viewer',
      status: profile.isActive ? 'active' : 'suspended',
      joinedAt: profile.createdAt.toISOString(),
      lastActiveAt: profile.lastLoginAt?.toISOString(),
    };
  }

  private invitationResponse(
    invitation: Pick<
      OrganizationInvitationEntity,
      | 'id'
      | 'email'
      | 'role'
      | 'invitedBy'
      | 'createdAt'
      | 'expiresAt'
      | 'status'
      | 'deliveryStatus'
    >,
  ) {
    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      invitedBy: invitation.invitedBy,
      invitedAt: invitation.createdAt.toISOString(),
      expiresAt: invitation.expiresAt.toISOString(),
      status:
        invitation.status === 'pending' && invitation.expiresAt.getTime() <= Date.now()
          ? 'expired'
          : invitation.status,
      deliveryStatus: invitation.deliveryStatus,
    };
  }

  private invitationUrl(token: string): string {
    const configured = this.config.get<string>('WEB_URL') || this.config.get<string>('APP_URL');
    try {
      const base = new URL(configured ?? '');
      const local = ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname);
      if (
        base.username ||
        base.password ||
        (base.protocol !== 'https:' &&
          !(base.protocol === 'http:' && local && this.config.get('NODE_ENV') !== 'production'))
      ) {
        throw new Error('Invalid public web URL');
      }
      const url = new URL('/join', base);
      url.hash = `token=${token}`;
      return url.toString();
    } catch {
      throw new ServiceUnavailableException(
        'A valid public WEB_URL is required for invitation links',
      );
    }
  }

  private hashToken(token: string): string {
    if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
      throw new BadRequestException('Invitation token is invalid');
    }
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }

  private async lockIdentity(manager: EntityManager, userId: string) {
    await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [
      `organization-membership:${userId}`,
    ]);
  }

  private validateActor(actor: OrganizationActor) {
    if (
      !actor ||
      typeof actor.sub !== 'string' ||
      !actor.sub.trim() ||
      actor.sub.trim() !== actor.sub ||
      actor.sub.length > 100
    ) {
      throw new ForbiddenException('An authenticated account is required');
    }
    this.normalizeEmail(actor.email);
  }

  private normalizeEmail(email: string): string {
    if (typeof email !== 'string' || email.length > 255 || !isEmail(email.trim())) {
      throw new BadRequestException('A valid email address is required');
    }
    return email.trim().toLowerCase();
  }

  private validateRole(role: string): asserts role is MemberRole {
    if (!Object.prototype.hasOwnProperty.call(ROLE_RANK, role))
      throw new BadRequestException('Invalid organization role');
  }

  private validateInvitationRole(role: string): asserts role is InvitationRole {
    if (!['admin', 'member', 'viewer'].includes(role))
      throw new BadRequestException('Invalid invitation role');
  }

  private validateOrganizationInput(dto: CreateOrganizationRequest) {
    if (
      !dto ||
      typeof dto.tenantId !== 'string' ||
      !/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(dto.tenantId)
    ) {
      throw new BadRequestException(
        'Tenant ID must be 3-50 lowercase letters, numbers, or internal hyphens',
      );
    }
    if (
      typeof dto.name !== 'string' ||
      dto.name.trim().length < 2 ||
      dto.name.length > 255 ||
      /[\x00-\x1f\x7f]/.test(dto.name)
    ) {
      throw new BadRequestException('Organization name must contain 2-255 printable characters');
    }
    if (
      dto.fiscalYearEndMonth !== undefined &&
      (!Number.isInteger(dto.fiscalYearEndMonth) ||
        dto.fiscalYearEndMonth < 1 ||
        dto.fiscalYearEndMonth > 12)
    ) {
      throw new BadRequestException('Fiscal year end month must be an integer from 1 to 12');
    }
    if (
      dto.currency !== undefined &&
      (typeof dto.currency !== 'string' || !/^[A-Z]{3}$/.test(dto.currency))
    ) {
      throw new BadRequestException('Currency must be a three-letter uppercase code');
    }
    for (const [value, limit] of [
      [dto.legalName, 255],
      [dto.taxNumber, 50],
      [dto.industry, 100],
    ] as const) {
      if (
        value !== undefined &&
        (typeof value !== 'string' ||
          !value.trim() ||
          value.length > limit ||
          /[\x00-\x1f\x7f]/.test(value))
      ) {
        throw new BadRequestException('Organization details contain an invalid field');
      }
    }
  }

  private validateMemberId(id: string) {
    if (typeof id !== 'string' || !id || id.length > 100 || /[\x00-\x20\x7f]/.test(id))
      throw new BadRequestException('Invalid member identifier');
  }

  private validateInvitationId(id: string) {
    if (!this.isUuid(id)) throw new BadRequestException('Invalid invitation identifier');
  }

  private isUuid(value: string) {
    return (
      typeof value === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    );
  }

  private checkListSize(count: number) {
    if (count > MAX_LIST_ROWS)
      throw new UnprocessableEntityException(
        'Organization directory exceeds the 5000-row response limit',
      );
  }

  private escapeHtml(value: string): string {
    return value.replace(
      /[&<>"']/g,
      (character) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!,
    );
  }

  private rethrowConflict(error: unknown): never {
    const failure = error as { code?: string; driverError?: { code?: string } };
    if (failure?.code === '23505' || failure?.driverError?.code === '23505') {
      throw new ConflictException(
        'This organization or account was created by another request; sign in again',
      );
    }
    throw error;
  }
}
