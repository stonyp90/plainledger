import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { AccountingConnectionsService } from '../accounting-connections.service';
import { CacheService } from '@infrastructure/cache/cache.service';
import { QuickBooksService } from '@infrastructure/adapters/accounting/quickbooks/quickbooks.service';
import { ConnectionTokenCipher } from '@infrastructure/auth/connection-token';
import { DataSourceConnectionEntity } from '@infrastructure/persistence/postgres/entities/data-source-connection.entity';
import { UserProfileEntity } from '@infrastructure/persistence/postgres/entities/user-profile.entity';
import { OrganizationEntity } from '@infrastructure/persistence/postgres/entities/organization.entity';
import { OrganizationFeaturePolicyService } from '../organization-feature-policy.service';
import { AccountingSyncService } from '../accounting-sync.service';

const configuration = (initial: Record<string, string>): ConfigService => {
  const values = { ...initial };
  return { get: (key: string) => values[key], set: (key: string, value: string) => { values[key] = value; } } as ConfigService;
};

const orgId = '00000000-0000-4000-8000-000000000101';
const connectionId = '00000000-0000-4000-8000-000000000102';
const actor = { sub: 'user-a', email: 'owner@example.test', organizationId: 'org-a' };

describe('AccountingConnectionsService authorization and persistence', () => {
  let service: AccountingConnectionsService;
  let config: ConfigService;
  const states = new Map<string, unknown>();
  const profile = { id: actor.sub, organizationId: orgId, role: 'owner', isActive: true, organization: { id: orgId, tenantId: 'org-a', name: 'Acme' } };
  const profiles = { findOne: jest.fn() };
  const organizations = { findOne: jest.fn() };
  const builder = { update: jest.fn(), set: jest.fn(), where: jest.fn(), execute: jest.fn() };
  const connections = { find: jest.fn(), findOne: jest.fn(), count: jest.fn(), create: jest.fn(), save: jest.fn(), createQueryBuilder: jest.fn(), manager: { transaction: jest.fn() } };
  const policy = { read: jest.fn() };
  const sync = { sync: jest.fn() };
  const cache = { putOAuthState: jest.fn(), consumeOAuthState: jest.fn() };
  const provider = { getAuthorizationUrl: jest.fn(), exchangeCodeForTokens: jest.fn(), getCompanyInfo: jest.fn() };
  const rawTokens = { accessToken: 'provider-access-secret', refreshToken: 'provider-refresh-secret', realmId: '12345', accessTokenExpiresAt: new Date(Date.now() + 3600_000), refreshTokenExpiresAt: new Date(Date.now() + 86400_000) };

  beforeEach(() => {
    jest.clearAllMocks(); states.clear();
    config = configuration({ NODE_ENV: 'test', QUICKBOOKS_CLIENT_ID: 'test-client', QUICKBOOKS_CLIENT_SECRET: 'test-secret', QUICKBOOKS_REDIRECT_URI: 'http://localhost:3001/api/v1/datasources/oauth/quickbooks/callback', QUICKBOOKS_ENVIRONMENT: 'sandbox', FRONTEND_URL: 'http://localhost:3000', CONNECTION_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64') });
    profiles.findOne.mockResolvedValue(profile);
    organizations.findOne.mockResolvedValue(profile.organization);
    connections.find.mockResolvedValue([]); connections.findOne.mockResolvedValue(null);
    connections.count.mockResolvedValue(0); policy.read.mockResolvedValue({ limits: { connections: 1 } });
    sync.sync.mockResolvedValue({ success: true, stats: { accountsSynced: 3, transactionsSynced: 5, ledgerLinesSynced: 10 }, syncedAt: new Date() });
    connections.create.mockImplementation((input) => ({ createdAt: new Date(), updatedAt: new Date(), ...input }));
    connections.save.mockImplementation(async (input) => input);
    connections.manager.transaction.mockImplementation(async (work) => work({ getRepository: (entity: unknown) => entity === OrganizationEntity ? organizations : entity === UserProfileEntity ? profiles : connections }));
    for (const name of ['update', 'set', 'where'] as const) builder[name].mockReturnValue(builder);
    builder.execute.mockResolvedValue({ affected: 1 }); connections.createQueryBuilder.mockReturnValue(builder);
    cache.putOAuthState.mockImplementation(async (state, value) => { states.set(state, value); });
    cache.consumeOAuthState.mockImplementation(async (state) => { const value = states.get(state) ?? null; states.delete(state); return value; });
    provider.getAuthorizationUrl.mockImplementation((state) => `https://appcenter.intuit.com/connect/oauth2?state=${state}`);
    provider.exchangeCodeForTokens.mockResolvedValue(rawTokens);
    provider.getCompanyInfo.mockResolvedValue({ companyName: 'Acme Books' });
    service = new AccountingConnectionsService(config, cache as unknown as CacheService, provider as unknown as QuickBooksService, connections as unknown as Repository<DataSourceConnectionEntity>, profiles as unknown as Repository<UserProfileEntity>, policy as unknown as OrganizationFeaturePolicyService, sync as unknown as AccountingSyncService);
  });

  const begin = () => service.beginOAuth(actor, 'quickbooks');

  it('enforces connection capacity before starting OAuth', async () => {
    connections.count.mockResolvedValue(1);
    await expect(begin()).rejects.toMatchObject({ status: 403 });
    expect(cache.putOAuthState).not.toHaveBeenCalled();
  });

  it('checks capacity again inside the callback transaction', async () => {
    const { state } = await begin();
    connections.count.mockResolvedValue(1);
    await expect(service.completeOAuth('quickbooks', { state, code: 'valid-code', realmId: '12345' })).rejects.toMatchObject({ status: 403 });
    expect(connections.save).not.toHaveBeenCalled();
  });

  it('honors unlimited connection plans without counting records', async () => {
    policy.read.mockResolvedValue({ limits: { connections: -1 } });
    await begin();
    expect(connections.count).not.toHaveBeenCalled();
  });

  it('reauthorization of the same active company does not consume another seat', async () => {
    const { state } = await begin();
    connections.findOne.mockResolvedValue({ id: connectionId, status: 'active' });
    connections.count.mockResolvedValue(1);
    await service.completeOAuth('quickbooks', { state, code: 'valid-code', realmId: '12345' });
    expect(connections.save).toHaveBeenCalledWith(expect.objectContaining({ id: connectionId }));
  });

  it('waits for an actual scoped ledger sync and preserves measured statistics', async () => {
    connections.findOne.mockResolvedValue({ id: connectionId, organizationId: orgId, status: 'active' });
    await expect(service.sync(actor, connectionId)).resolves.toMatchObject({ success: true, stats: { ledgerLinesSynced: 10 } });
    expect(sync.sync).toHaveBeenCalledWith(connectionId, orgId, actor.organizationId);
  });

  it('does not report successful sync when the worker fails', async () => {
    connections.findOne.mockResolvedValue({ id: connectionId, organizationId: orgId, status: 'active' });
    sync.sync.mockRejectedValueOnce(new Error('Trial balance mismatch'));
    await expect(service.sync(actor, connectionId)).rejects.toThrow('Trial balance mismatch');
  });

  it('returns a real empty organization connection list', async () => {
    await expect(service.list(actor)).resolves.toEqual([]);
    expect(connections.find).toHaveBeenCalledWith({ where: { organizationId: orgId }, order: { createdAt: 'ASC' } });
  });

  it('rejects a different selected tenant and revoked membership', async () => {
    await expect(service.list(actor, 'org-b')).rejects.toMatchObject({ status: 403 });
    profiles.findOne.mockResolvedValue(null);
    await expect(service.list(actor)).rejects.toMatchObject({ status: 403 });
    expect(connections.find).not.toHaveBeenCalled();
  });

  it('checks current administrator membership before issuing provider URLs', async () => {
    profiles.findOne.mockResolvedValue({ ...profile, role: 'viewer' });
    await expect(begin()).rejects.toMatchObject({ status: 403 });
    expect(provider.getAuthorizationUrl).not.toHaveBeenCalled();
  });

  it.each(['QUICKBOOKS_CLIENT_ID', 'QUICKBOOKS_CLIENT_SECRET', 'QUICKBOOKS_REDIRECT_URI', 'QUICKBOOKS_ENVIRONMENT', 'CONNECTION_TOKEN_ENCRYPTION_KEY'])('rejects missing %s without placeholder URLs', async (key) => {
    config.set(key, '');
    await expect(begin()).rejects.toMatchObject({ status: 503 });
    expect(states.size).toBe(0);
  });

  it.each(['xero', 'sage', 'freshbooks', 'unknown'])('does not fake support for %s', async (name) => {
    await expect(service.beginOAuth(actor, name)).rejects.toMatchObject({ status: 501 });
  });

  it('rejects a caller-controlled redirect and production plaintext callbacks', async () => {
    await expect(service.beginOAuth(actor, 'quickbooks', 'https://other.example/callback')).rejects.toMatchObject({ status: 400 });
    config.set('NODE_ENV', 'production');
    await expect(begin()).rejects.toMatchObject({ status: 503 });
  });

  it('creates an expiring state bound to the initiating user, org and environment', async () => {
    const result = await begin();
    expect(result.state).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(cache.putOAuthState).toHaveBeenCalledWith(result.state, expect.objectContaining({ sub: actor.sub, organizationId: orgId, tenantId: 'org-a', environment: 'sandbox', expiresAt: expect.any(Number) }), 600);
  });

  it('persists encrypted credentials and uses the authorized environment', async () => {
    const { state } = await begin();
    const result = await service.completeOAuth('quickbooks', { state, code: 'valid-code', realmId: '12345' });
    expect(result).toMatchObject({ provider: 'quickbooks', name: 'Acme Books', status: 'connected' });
    expect(provider.getCompanyInfo).toHaveBeenCalledWith(rawTokens.accessToken, '12345', true);
    const saved = connections.save.mock.calls[0][0];
    const cipher = new ConnectionTokenCipher(config);
    expect(saved.organizationId).toBe(orgId);
    expect(saved.accessTokenEncrypted).not.toContain(rawTokens.accessToken);
    expect(cipher.decrypt(saved.accessTokenEncrypted, `${orgId}:${result.id}:access`)).toBe(rawTokens.accessToken);
    expect(cipher.decrypt(saved.refreshTokenEncrypted, `${orgId}:${result.id}:refresh`)).toBe(rawTokens.refreshToken);
    expect(JSON.stringify(result)).not.toContain('secret');
  });

  it('does not persist or acknowledge a provider exchange failure', async () => {
    const { state } = await begin(); provider.exchangeCodeForTokens.mockRejectedValueOnce(new Error('Provider offline'));
    await expect(service.completeOAuth('quickbooks', { state, code: 'code', realmId: '12345' })).rejects.toThrow();
    expect(connections.save).not.toHaveBeenCalled();
    await expect(service.completeOAuth('quickbooks', { state, code: 'code', realmId: '12345' })).rejects.toMatchObject({ status: 400 });
  });

  it('rejects expired state, provider mismatch and authorization denial before exchanging codes', async () => {
    const first = await begin(); const payload = states.get(first.state) as { expiresAt: number }; payload.expiresAt = Date.now() - 1;
    await expect(service.completeOAuth('quickbooks', { state: first.state, code: 'code', realmId: '12345' })).rejects.toMatchObject({ status: 400 });
    const second = await begin();
    await expect(service.completeOAuth('xero', { state: second.state, code: 'code', realmId: '12345' })).rejects.toMatchObject({ status: 400 });
    const third = await begin();
    await expect(service.completeOAuth('quickbooks', { state: third.state, error: 'access_denied' })).rejects.toMatchObject({ status: 400 });
    expect(provider.exchangeCodeForTokens).not.toHaveBeenCalled();
  });

  it('rejects a callback from another authenticated subject', async () => {
    const { state } = await begin();
    await expect(service.completeOAuth('quickbooks', { state, code: 'code', realmId: '12345' }, { ...actor, sub: 'user-b' })).rejects.toMatchObject({ status: 403 });
    expect(provider.exchangeCodeForTokens).not.toHaveBeenCalled();
  });

  it('checks for removal or demotion again when the browser returns', async () => {
    const { state } = await begin(); profiles.findOne.mockResolvedValue({ ...profile, role: 'viewer' });
    await expect(service.completeOAuth('quickbooks', { state, code: 'code', realmId: '12345' })).rejects.toMatchObject({ status: 403 });
    expect(provider.exchangeCodeForTokens).not.toHaveBeenCalled();
  });

  it('rejects incomplete callbacks and expired provider credentials', async () => {
    const first = await begin();
    await expect(service.completeOAuth('quickbooks', { state: first.state, code: 'code' })).rejects.toMatchObject({ status: 400 });
    const second = await begin(); provider.exchangeCodeForTokens.mockResolvedValue({ ...rawTokens, accessTokenExpiresAt: new Date(0) });
    await expect(service.completeOAuth('quickbooks', { state: second.state, code: 'code', realmId: '12345' })).rejects.toMatchObject({ status: 503 });
    expect(connections.save).not.toHaveBeenCalled();
  });

  it('scope-checks connection identifiers and removes stored credentials on disconnect', async () => {
    connections.findOne.mockResolvedValue({ id: connectionId, organizationId: orgId, status: 'active' });
    await service.disconnect(actor, connectionId);
    expect(connections.findOne).toHaveBeenCalledWith({ where: { id: connectionId, organizationId: orgId } });
    expect(builder.where).toHaveBeenCalledWith('id = :id AND organization_id = :organizationId', { id: connectionId, organizationId: orgId });
    expect(builder.set).toHaveBeenCalledWith(expect.objectContaining({ status: 'disconnected', accessTokenEncrypted: expect.any(Function), refreshTokenEncrypted: expect.any(Function) }));
  });

  it('does not expose a foreign or absent connection', async () => {
    await expect(service.get(actor, connectionId)).rejects.toMatchObject({ status: 404 });
    await expect(service.get(actor, 'invalid')).rejects.toMatchObject({ status: 400 });
  });

  it('builds redirects only to the configured app route', () => {
    expect(service.redirectUrl('quickbooks')).toMatch(/^http:\/\/localhost:3000\/app\/connections\?/);
  });
});

describe('ConnectionTokenCipher', () => {
  const cipher = new ConnectionTokenCipher(configuration({ CONNECTION_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 4).toString('base64') }));
  it('rejects ciphertext copied to another tenant, connection or token kind', () => {
    const encrypted = cipher.encrypt('private-credential', 'org-a:connection-a:access');
    expect(() => cipher.decrypt(encrypted, 'org-b:connection-a:access')).toThrow();
    expect(() => cipher.decrypt(encrypted, 'org-a:connection-b:access')).toThrow();
    expect(() => cipher.decrypt(encrypted, 'org-a:connection-a:refresh')).toThrow();
  });
  it('uses a fresh encryption nonce and rejects tampered ciphertext', () => {
    const encrypted = cipher.encrypt('credential', 'context');
    expect(cipher.encrypt('credential', 'context')).not.toBe(encrypted);
    const parts = encrypted.split('.'); parts[2] = Buffer.alloc(16).toString('base64url');
    expect(() => cipher.decrypt(parts.join('.'), 'context')).toThrow();
  });
});
