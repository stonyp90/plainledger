import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { KEYCLOAK_INSTANCE } from 'nest-keycloak-connect';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { TenantGuard, validateOrganizationAccess } from '../tenant.guard';
import { createTestIdentityProvider } from './test-identity-provider';
import { OrganizationController } from '@infrastructure/http/controllers/organization.controller';
import { UserProfileEntity } from '@infrastructure/persistence/postgres/entities/user-profile.entity';
import { OrganizationMembershipService } from '@application/services/organization-membership.service';
import { GetOrganizationUseCase } from '@application/use-cases/get-organization.use-case';
import { Repository } from 'typeorm';

describe('Authenticated organization HTTP boundary', () => {
  const identity = createTestIdentityProvider();
  const profile = { organizationId: 'org-123', organization: { tenantId: 'our-company' } };
  const profiles = { findOne: jest.fn() };
  const getOrganization = { execute: jest.fn() };
  const createOrganization = {
    createOwnedOrganization: jest.fn(),
    previewInvitation: jest.fn(),
    acceptInvitationForExistingUser: jest.fn(),
  };
  let app: INestApplication;
  let baseURL: string;

  const request = async (path: string, options: { method?: string; authorization?: string; body?: unknown } = {}) => {
    const response = await fetch(`${baseURL}${path}`, {
      method: options.method || 'GET',
      headers: { 'Content-Type': 'application/json', ...(options.authorization ? { Authorization: options.authorization } : {}) },
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    });
    await response.arrayBuffer();
    return response.status;
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [OrganizationController],
      providers: [
        JwtAuthGuard, TenantGuard,
        { provide: ConfigService, useValue: identity.config },
        { provide: KEYCLOAK_INSTANCE, useValue: identity.keycloak },
        { provide: getRepositoryToken(UserProfileEntity), useValue: profiles },
        { provide: GetOrganizationUseCase, useValue: getOrganization },
        { provide: OrganizationMembershipService, useValue: createOrganization },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalGuards(module.get(JwtAuthGuard));
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    await app.listen(0, '127.0.0.1');
    baseURL = await app.getUrl();
  });

  beforeEach(() => {
    profiles.findOne.mockReset().mockResolvedValue(profile);
    getOrganization.execute.mockReset().mockImplementation(async ({ tenantId }: { tenantId: string }) => ({ tenantId }));
    createOrganization.createOwnedOrganization.mockReset().mockResolvedValue({ id: 'new-org' });
    createOrganization.previewInvitation.mockReset().mockResolvedValue({ tenantId: 'our-company', role: 'viewer' });
    createOrganization.acceptInvitationForExistingUser.mockReset().mockResolvedValue({ id: 'org-123', tenantId: 'our-company' });
  });
  afterAll(async () => { await app?.close(); identity.onlineValidation.mockRestore(); });

  const authenticate = (claims: Record<string, unknown> = {}) => `Bearer ${identity.issueToken(claims)}`;

  it('allows anonymous invitation preview through the declared Keycloak public route', async () => {
    const token = 'a'.repeat(43);
    await expect(request('/organizations/invitations/preview', { method: 'POST', body: { token } })).resolves.toBe(200);
    expect(createOrganization.previewInvitation).toHaveBeenCalledWith(token);
    expect(profiles.findOne).not.toHaveBeenCalled();
    expect(createOrganization.acceptInvitationForExistingUser).not.toHaveBeenCalled();
  });

  it('validates anonymous invitation tokens before any preview lookup', async () => {
    await expect(request('/organizations/invitations/preview', { method: 'POST', body: { token: 'invalid' } })).resolves.toBe(400);
    expect(createOrganization.previewInvitation).not.toHaveBeenCalled();
  });

  it('still requires authentication to accept an otherwise valid invitation', async () => {
    await expect(request('/organizations/invitations/accept', { method: 'POST', body: { token: 'a'.repeat(43) } })).resolves.toBe(401);
    expect(createOrganization.acceptInvitationForExistingUser).not.toHaveBeenCalled();
    expect(profiles.findOne).not.toHaveBeenCalled();
  });

  it.each(['members', 'invitations'])('keeps private organization %s inaccessible without authentication', async (resource) => {
    await expect(request(`/organizations/our-company/${resource}`)).resolves.toBe(401);
    expect(profiles.findOne).not.toHaveBeenCalled();
  });

  it('requires a token before any membership or organization read', async () => {
    await expect(request('/organizations/our-company')).resolves.toBe(401);
    expect(profiles.findOne).not.toHaveBeenCalled();
    expect(getOrganization.execute).not.toHaveBeenCalled();
  });

  it('accepts the current member using the tenant slug', async () => {
    await expect(request('/organizations/our-company', { authorization: authenticate() })).resolves.toBe(200);
    expect(profiles.findOne).toHaveBeenCalledWith({ where: { id: 'user-123', isActive: true }, relations: ['organization'] });
    expect(getOrganization.execute).toHaveBeenCalledWith({ tenantId: 'our-company' });
  });

  it('blocks a different tenant even for an organization admin', async () => {
    await expect(request('/organizations/another-company', { authorization: authenticate({ realm_access: { roles: ['admin'] } }) })).resolves.toBe(403);
    expect(getOrganization.execute).not.toHaveBeenCalled();
  });

  it('validates every organization identifier, including query conflicts', async () => {
    await expect(request('/organizations/our-company?organizationId=foreign-org', { authorization: authenticate() })).resolves.toBe(403);
    expect(getOrganization.execute).not.toHaveBeenCalled();
  });

  it('rejects array identifiers instead of accepting only the first value', async () => {
    await expect(request('/organizations/our-company?orgId=org-123&orgId=foreign-org', { authorization: authenticate() })).resolves.toBe(400);
    expect(getOrganization.execute).not.toHaveBeenCalled();
  });

  it('immediately blocks a removed or deactivated membership', async () => {
    const token = authenticate();
    await expect(request('/organizations/our-company', { authorization: token })).resolves.toBe(200);
    profiles.findOne.mockResolvedValue(null);
    await expect(request('/organizations/our-company', { authorization: token })).resolves.toBe(403);
    expect(getOrganization.execute).toHaveBeenCalledTimes(1);
  });

  it('allows an explicit platform role to read another tenant', async () => {
    await expect(request('/organizations/another-company', { authorization: authenticate({ realm_access: { roles: ['platform-admin'] } }) })).resolves.toBe(200);
    expect(profiles.findOne).not.toHaveBeenCalled();
  });

  it.each([
    { tenantId: 'our-company', name: 'Company', fiscalYearEndMonth: 13 },
    { tenantId: 'our-company', name: 'Company', currency: 'not-a-currency' },
    { tenantId: 'our-company', name: '' },
    { tenantId: 'our-company', name: 'Company', unexpected: true },
  ])('rejects invalid organization input before writes: %j', async (body) => {
    await expect(request('/organizations', { method: 'POST', authorization: authenticate(), body })).resolves.toBe(400);
    expect(createOrganization.createOwnedOrganization).not.toHaveBeenCalled();
  });

  it('accepts declared organization fields under the production validation pipe', async () => {
    await expect(request('/organizations', { method: 'POST', authorization: authenticate(),
      body: { tenantId: 'our-company', name: 'Company', currency: 'CAD', fiscalYearEndMonth: 12 } })).resolves.toBe(201);
    expect(createOrganization.createOwnedOrganization).toHaveBeenCalledTimes(1);
  });

  it('cannot create or reserve a different tenant', async () => {
    await expect(request('/organizations', { method: 'POST', authorization: authenticate(),
      body: { tenantId: 'another-company', name: 'Company' } })).resolves.toBe(403);
    expect(createOrganization.createOwnedOrganization).not.toHaveBeenCalled();
  });

  it('does not allow TypeORM to omit an undefined identity filter', async () => {
    await expect(validateOrganizationAccess(profiles as unknown as Repository<UserProfileEntity>, undefined as unknown as string, 'org-123')).resolves.toBe(false);
    expect(profiles.findOne).not.toHaveBeenCalled();
  });
});
