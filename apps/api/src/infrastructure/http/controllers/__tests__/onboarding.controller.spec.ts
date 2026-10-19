import { DataSource } from 'typeorm';
import { OnboardingController, OnboardingCompleteDto } from '../onboarding.controller';
import { AuthenticatedUser } from '@infrastructure/auth/keycloak-token';
import { OrganizationEntity } from '@infrastructure/persistence/postgres/entities/organization.entity';
import { UserProfileEntity } from '@infrastructure/persistence/postgres/entities/user-profile.entity';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

const user: AuthenticatedUser = { sub: 'owner-a', userId: 'owner-a', email: 'owner@example.test', emailVerified: true, organizationId: 'tenant-a', roles: ['owner'] };
describe('Authenticated onboarding', () => {
  const profiles = { findOne: jest.fn(), save: jest.fn() }, organizations = { findOne: jest.fn(), save: jest.fn() };
  const manager = { getRepository: (entity: unknown) => entity === UserProfileEntity ? profiles : entity === OrganizationEntity ? organizations : undefined };
  const database = { transaction: jest.fn() };
  let controller: OnboardingController;
  let organization: OrganizationEntity, profile: UserProfileEntity;
  beforeEach(() => {
    jest.resetAllMocks();
    organization = { id: 'org-a', tenantId: 'tenant-a', name: 'Existing company', industry: 'retail', currency: 'CAD', fiscalYearEndMonth: 12 } as OrganizationEntity;
    profile = { id: user.sub, organizationId: organization.id, role: 'owner', isActive: true } as UserProfileEntity;
    profiles.findOne.mockImplementation(async () => profile); organizations.findOne.mockImplementation(async () => organization);
    profiles.save.mockImplementation(async (value) => value); organizations.save.mockImplementation(async (value) => value);
    database.transaction.mockImplementation(async (callback) => callback(manager));
    controller = new OnboardingController(database as unknown as DataSource);
  });
  const complete = (input: Partial<OnboardingCompleteDto> = {}, actor: AuthenticatedUser = user) => controller.completeOnboarding({ companyName: 'Existing company', ...input }, { user: actor });
  it('binds profile and organization writes to the verified subject instead of a supplied email', async () => {
    await expect(complete({ email: 'victim@example.test' })).rejects.toMatchObject({ status: 400 });
    expect(database.transaction).not.toHaveBeenCalled();
  });
  it('requires a verified signed-in account', async () => {
    await expect(complete({}, { ...user, emailVerified: false })).rejects.toMatchObject({ status: 403 });
    await expect(complete({}, { ...user, sub: '' })).rejects.toMatchObject({ status: 403 });
    expect(database.transaction).not.toHaveBeenCalled();
  });
  it('rejects missing or revoked membership', async () => {
    profiles.findOne.mockResolvedValueOnce(null);
    await expect(complete()).rejects.toMatchObject({ status: 403 });
    profiles.findOne.mockResolvedValueOnce(profile).mockResolvedValueOnce(null);
    await expect(complete()).rejects.toMatchObject({ status: 403 });
    expect(profiles.save).not.toHaveBeenCalled();
  });
  it('rejects a different or deleted organization', async () => {
    organization.tenantId = 'tenant-b';
    await expect(complete()).rejects.toMatchObject({ status: 403 });
    organization.tenantId = 'tenant-a'; organization.deletedAt = new Date();
    await expect(complete()).rejects.toMatchObject({ status: 403 });
  });
  it('updates the registered organization and profile in a single transaction', async () => {
    await expect(complete({ companyName: 'New company', industry: 'services' })).resolves.toMatchObject({ success: true, organizationId: 'org-a', tenantId: 'tenant-a', teamInvitationsSent: 0 });
    expect(organizations.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'org-a', name: 'New company' }));
    expect(profiles.save).toHaveBeenCalledWith(expect.objectContaining({ id: user.sub, organizationId: 'org-a', onboardingCompleted: true }));
    expect(database.transaction).toHaveBeenCalledTimes(1);
  });
  it('allows members to complete personal onboarding but cannot change company details', async () => {
    profile.role = 'member';
    await expect(complete()).resolves.toMatchObject({ success: true });
    await expect(complete({ companyName: 'Hijacked name' })).rejects.toMatchObject({ status: 403 });
    expect(organizations.save).not.toHaveBeenCalled();
  });
  it('checks current database role even when the JWT still contains owner', async () => {
    profile.role = 'viewer';
    await expect(complete({ currency: 'USD' })).rejects.toMatchObject({ status: 403 });
  });
  it('preserves the original completion timestamp when retried', async () => {
    profile.onboardingCompletedAt = new Date('2026-01-01');
    await complete();
    expect(profiles.save).toHaveBeenCalledWith(expect.objectContaining({ onboardingCompletedAt: new Date('2026-01-01') }));
  });
  it('propagates a database failure without acknowledging completed onboarding', async () => {
    profiles.save.mockRejectedValueOnce(new Error('Database unavailable'));
    await expect(complete({ companyName: 'New company' })).rejects.toThrow('Database unavailable');
  });
  it.each([{ companyName: ' ' }, { companyName: 'Name', fiscalYearEnd: 13 }, { companyName: 'Name', currency: 'wrong' }, { companyName: 'Name', teamEmails: ['invalid-email'] }])('rejects invalid request data %j', async (input) => {
    expect((await validate(plainToInstance(OnboardingCompleteDto, input))).length).toBeGreaterThan(0);
  });
});
