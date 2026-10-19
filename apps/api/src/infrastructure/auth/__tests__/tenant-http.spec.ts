import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { KEYCLOAK_INSTANCE } from 'nest-keycloak-connect';
interface HttpAssertion {
  set(name: string, value: string): HttpAssertion;
  send(body: unknown): HttpAssertion;
  expect(status: number): Promise<unknown>;
}
const request = require('supertest') as (server: unknown) => {
  get(path: string): HttpAssertion; post(path: string): HttpAssertion;
};
import { JwtAuthGuard } from '../jwt-auth.guard';
import { TenantGuard, validateOrganizationAccess } from '../tenant.guard';
import { createTestIdentityProvider } from './test-identity-provider';
import { OrganizationController } from '@infrastructure/http/controllers/organization.controller';
import { UserProfileEntity } from '@infrastructure/persistence/postgres/entities/user-profile.entity';
import { CreateOrganizationUseCase } from '@application/use-cases/create-organization.use-case';
import { GetOrganizationUseCase } from '@application/use-cases/get-organization.use-case';
import { Repository } from 'typeorm';

describe('Authenticated organization HTTP boundary', () => {
  const identity = createTestIdentityProvider();
  const profile = { organizationId: 'org-123', organization: { tenantId: 'our-company' } };
  const profiles = { findOne: jest.fn() };
  const getOrganization = { execute: jest.fn() };
  const createOrganization = { execute: jest.fn() };
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [OrganizationController],
      providers: [
        JwtAuthGuard, TenantGuard,
        { provide: ConfigService, useValue: identity.config },
        { provide: KEYCLOAK_INSTANCE, useValue: identity.keycloak },
        { provide: getRepositoryToken(UserProfileEntity), useValue: profiles },
        { provide: GetOrganizationUseCase, useValue: getOrganization },
        { provide: CreateOrganizationUseCase, useValue: createOrganization },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalGuards(module.get(JwtAuthGuard));
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    await app.listen(0, '127.0.0.1');
  });

  beforeEach(() => {
    profiles.findOne.mockReset().mockResolvedValue(profile);
    getOrganization.execute.mockReset().mockImplementation(async ({ tenantId }: { tenantId: string }) => ({ tenantId }));
    createOrganization.execute.mockReset().mockResolvedValue({ id: 'new-org' });
  });
  afterAll(async () => { await app.close(); identity.onlineValidation.mockRestore(); });

  const authenticate = (claims: Record<string, unknown> = {}) => `Bearer ${identity.issueToken(claims)}`;

  it('requires a token before any membership or organization read', async () => {
    await request(app.getHttpServer()).get('/organizations/our-company').expect(401);
    expect(profiles.findOne).not.toHaveBeenCalled();
    expect(getOrganization.execute).not.toHaveBeenCalled();
  });

  it('accepts the current member using the tenant slug', async () => {
    await request(app.getHttpServer()).get('/organizations/our-company').set('Authorization', authenticate()).expect(200);
    expect(profiles.findOne).toHaveBeenCalledWith({ where: { id: 'user-123', isActive: true }, relations: ['organization'] });
    expect(getOrganization.execute).toHaveBeenCalledWith({ tenantId: 'our-company' });
  });

  it('blocks a different tenant even for an organization admin', async () => {
    await request(app.getHttpServer()).get('/organizations/another-company')
      .set('Authorization', authenticate({ realm_access: { roles: ['admin'] } })).expect(403);
    expect(getOrganization.execute).not.toHaveBeenCalled();
  });

  it('validates every organization identifier, including query conflicts', async () => {
    await request(app.getHttpServer()).get('/organizations/our-company?organizationId=foreign-org')
      .set('Authorization', authenticate()).expect(403);
    expect(getOrganization.execute).not.toHaveBeenCalled();
  });

  it('rejects array identifiers instead of accepting only the first value', async () => {
    await request(app.getHttpServer()).get('/organizations/our-company?orgId=org-123&orgId=foreign-org')
      .set('Authorization', authenticate()).expect(400);
    expect(getOrganization.execute).not.toHaveBeenCalled();
  });

  it('immediately blocks a removed or deactivated membership', async () => {
    const token = authenticate();
    await request(app.getHttpServer()).get('/organizations/our-company').set('Authorization', token).expect(200);
    profiles.findOne.mockResolvedValue(null);
    await request(app.getHttpServer()).get('/organizations/our-company').set('Authorization', token).expect(403);
    expect(getOrganization.execute).toHaveBeenCalledTimes(1);
  });

  it('allows an explicit platform role to read another tenant', async () => {
    await request(app.getHttpServer()).get('/organizations/another-company')
      .set('Authorization', authenticate({ realm_access: { roles: ['platform-admin'] } })).expect(200);
    expect(profiles.findOne).not.toHaveBeenCalled();
  });

  it.each([
    { tenantId: 'our-company', name: 'Company', fiscalYearEndMonth: 13 },
    { tenantId: 'our-company', name: 'Company', currency: 'not-a-currency' },
    { tenantId: 'our-company', name: '' },
    { tenantId: 'our-company', name: 'Company', unexpected: true },
  ])('rejects invalid organization input before writes: %j', async (body) => {
    await request(app.getHttpServer()).post('/organizations').set('Authorization', authenticate()).send(body).expect(400);
    expect(createOrganization.execute).not.toHaveBeenCalled();
  });

  it('accepts declared organization fields under the production validation pipe', async () => {
    await request(app.getHttpServer()).post('/organizations').set('Authorization', authenticate())
      .send({ tenantId: 'our-company', name: 'Company', currency: 'CAD', fiscalYearEndMonth: 12 }).expect(201);
    expect(createOrganization.execute).toHaveBeenCalledTimes(1);
  });

  it('cannot create or reserve a different tenant', async () => {
    await request(app.getHttpServer()).post('/organizations').set('Authorization', authenticate())
      .send({ tenantId: 'another-company', name: 'Company' }).expect(403);
    expect(createOrganization.execute).not.toHaveBeenCalled();
  });

  it('does not allow TypeORM to omit an undefined identity filter', async () => {
    await expect(validateOrganizationAccess(profiles as unknown as Repository<UserProfileEntity>, undefined as unknown as string, 'org-123')).resolves.toBe(false);
    expect(profiles.findOne).not.toHaveBeenCalled();
  });
});
