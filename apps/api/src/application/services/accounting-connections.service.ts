import {
  BadRequestException, ForbiddenException, Injectable, NotFoundException,
  NotImplementedException, ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes, randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { CacheService } from '@infrastructure/cache/cache.service';
import { ConnectionTokenCipher } from '@infrastructure/auth/connection-token';
import { AuthenticatedUser } from '@infrastructure/auth/keycloak-token';
import { QuickBooksService } from '@infrastructure/adapters/accounting/quickbooks/quickbooks.service';
import { DataSourceConnectionEntity } from '@infrastructure/persistence/postgres/entities/data-source-connection.entity';
import { OrganizationEntity } from '@infrastructure/persistence/postgres/entities/organization.entity';
import { UserProfileEntity } from '@infrastructure/persistence/postgres/entities/user-profile.entity';
import { OrganizationFeaturePolicyService } from './organization-feature-policy.service';
import { AccountingSyncService } from './accounting-sync.service';

export type ConnectionActor = Pick<AuthenticatedUser, 'sub' | 'email' | 'organizationId'>;
export interface ConnectionView {
  id: string; provider: string; name: string; companyName?: string; status: string;
  createdAt: string; updatedAt: string; lastSyncAt?: string;
  accountsCount?: number; transactionsCount?: number;
}
export interface ProviderCallback { code?: string; state: string; realmId?: string; error?: string }
interface OAuthState {
  version: 1; provider: 'quickbooks'; sub: string; email: string;
  organizationId: string; tenantId: string; environment: 'sandbox' | 'production'; expiresAt: number;
}

/** A single persistence and authorization boundary for REST and GraphQL connections. */
@Injectable()
export class AccountingConnectionsService {
  private readonly cipher: ConnectionTokenCipher;

  constructor(
    private readonly config: ConfigService,
    private readonly cache: CacheService,
    private readonly quickbooks: QuickBooksService,
    @InjectRepository(DataSourceConnectionEntity) private readonly connections: Repository<DataSourceConnectionEntity>,
    @InjectRepository(UserProfileEntity) private readonly profiles: Repository<UserProfileEntity>,
    private readonly policy: OrganizationFeaturePolicyService,
    private readonly accountingSync: AccountingSyncService,
  ) { this.cipher = new ConnectionTokenCipher(config); }

  async list(actor: ConnectionActor, selectedTenant?: string): Promise<ConnectionView[]> {
    const profile = await this.authorize(actor);
    if (selectedTenant !== undefined && selectedTenant !== profile.organization.tenantId) {
      throw new ForbiddenException('The selected organization does not match your session');
    }
    return (await this.connections.find({ where: { organizationId: profile.organizationId }, order: { createdAt: 'ASC' } })).map((row) => this.view(row));
  }

  async get(actor: ConnectionActor, id: string): Promise<ConnectionView> {
    const profile = await this.authorize(actor);
    return this.view(await this.findConnection(profile.organizationId, id));
  }

  async beginOAuth(actor: ConnectionActor, provider: string, requestedRedirect?: string) {
    const profile = await this.authorize(actor, true);
    const { redirectUri, environment } = this.providerConfiguration(provider);
    await this.assertConnectionCapacity(profile.organizationId, this.connections);
    this.cipher.assertConfigured();
    this.frontendUrl();
    if (requestedRedirect !== undefined && requestedRedirect !== redirectUri) {
      throw new BadRequestException('OAuth redirect URI must match the configured callback');
    }
    const state = randomBytes(32).toString('base64url');
    const payload: OAuthState = {
      version: 1, provider: 'quickbooks', sub: actor.sub, email: actor.email,
      organizationId: profile.organizationId, tenantId: profile.organization.tenantId,
      environment, expiresAt: Date.now() + 600_000,
    };
    await this.cache.putOAuthState(state, payload, 600);
    return { url: this.quickbooks.getAuthorizationUrl(state), state, provider };
  }

  async completeOAuth(provider: string | undefined, callback: ProviderCallback, actor?: ConnectionActor): Promise<ConnectionView> {
    if (typeof callback.state !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(callback.state)) {
      throw new BadRequestException('Invalid or expired OAuth state. Start the connection again.');
    }
    const stored = await this.cache.consumeOAuthState(callback.state);
    if (!this.validState(stored) || (provider !== undefined && provider !== stored.provider)) {
      throw new BadRequestException('Invalid or expired OAuth state. Start the connection again.');
    }
    if (actor && (actor.sub !== stored.sub || actor.organizationId !== stored.tenantId)) {
      throw new ForbiddenException('OAuth authorization belongs to a different session');
    }
    const profile = await this.authorize({ sub: stored.sub, email: stored.email, organizationId: stored.tenantId }, true);
    if (profile.organizationId !== stored.organizationId) throw new ForbiddenException('Organization membership changed during authorization');
    const configuration = this.providerConfiguration(stored.provider);
    if (configuration.environment !== stored.environment) throw new BadRequestException('Provider configuration changed. Start the connection again.');
    if (callback.error !== undefined) throw new BadRequestException('Provider authorization was declined or could not be completed');
    if (typeof callback.code !== 'string' || !callback.code.trim() || callback.code.length > 4096 ||
        typeof callback.realmId !== 'string' || !/^\d{1,32}$/.test(callback.realmId)) {
      throw new BadRequestException('The provider callback is incomplete or invalid');
    }
    this.cipher.assertConfigured();
    const tokens = await this.quickbooks.exchangeCodeForTokens(callback.code, callback.realmId);
    if (!tokens.accessToken || !tokens.refreshToken || !Number.isFinite(tokens.accessTokenExpiresAt?.getTime()) ||
        tokens.accessTokenExpiresAt.getTime() <= Date.now() || !Number.isFinite(tokens.refreshTokenExpiresAt?.getTime())) {
      throw new ServiceUnavailableException('The accounting provider returned invalid credentials');
    }
    const company = await this.quickbooks.getCompanyInfo(tokens.accessToken, callback.realmId, stored.environment === 'sandbox');
    if (typeof company.companyName !== 'string' || !company.companyName.trim() || company.companyName.length > 255) {
      throw new ServiceUnavailableException('The accounting provider did not return a valid company');
    }
    return this.connections.manager.transaction(async (manager) => {
      const organization = await manager.getRepository(OrganizationEntity).findOne({
        where: { id: stored.organizationId }, lock: { mode: 'pessimistic_write' },
      });
      if (!organization || organization.deletedAt) throw new ForbiddenException('Organization is no longer available');
      const current = await manager.getRepository(UserProfileEntity).findOne({ where: { id: stored.sub, organizationId: stored.organizationId, isActive: true } });
      if (!current || !['owner', 'admin'].includes(current.role || '')) throw new ForbiddenException('Connection administrator access is no longer available');
      const repository = manager.getRepository(DataSourceConnectionEntity);
      const existing = await repository.findOne({ where: { organizationId: stored.organizationId, provider: 'quickbooks', providerAccountId: callback.realmId } });
      if (existing?.status !== 'active') await this.assertConnectionCapacity(stored.organizationId, repository);
      const id = existing?.id || randomUUID();
      const prefix = `${stored.organizationId}:${id}`;
      const row = repository.create({
        ...existing, id, organizationId: stored.organizationId, provider: 'quickbooks', status: 'active',
        providerAccountId: callback.realmId, providerCompanyId: callback.realmId, providerAccountName: company.companyName,
        accessTokenEncrypted: this.cipher.encrypt(tokens.accessToken, `${prefix}:access`),
        refreshTokenEncrypted: this.cipher.encrypt(tokens.refreshToken, `${prefix}:refresh`),
        tokenExpiresAt: tokens.accessTokenExpiresAt, refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
        connectedByUserId: stored.sub, connectedByEmail: stored.email,
        metadata: { ...existing?.metadata, environment: stored.environment }, scopes: ['com.intuit.quickbooks.accounting'],
      });
      return this.view(await repository.save(row));
    });
  }

  async disconnect(actor: ConnectionActor, id: string): Promise<void> {
    const profile = await this.authorize(actor, true);
    await this.findConnection(profile.organizationId, id);
    await this.connections.createQueryBuilder().update().set({
      status: 'disconnected', accessTokenEncrypted: () => 'NULL', refreshTokenEncrypted: () => 'NULL',
      tokenExpiresAt: () => 'NULL', refreshTokenExpiresAt: () => 'NULL',
      disconnectedAt: new Date(), disconnectedByUserId: actor.sub,
    }).where('id = :id AND organization_id = :organizationId', { id, organizationId: profile.organizationId }).execute();
  }

  async sync(actor: ConnectionActor, id: string) {
    const profile = await this.authorize(actor, true);
    const connection = await this.findConnection(profile.organizationId, id);
    if (connection.status !== 'active') throw new BadRequestException('Reconnect this data source before syncing');
    return this.accountingSync.sync(connection.id, profile.organizationId, profile.organization.tenantId);
  }

  private async assertConnectionCapacity(organizationId: string, repository: Repository<DataSourceConnectionEntity>) {
    const policy = await this.policy.read(organizationId, repository.manager);
    const limit = policy.limits.connections;
    if (limit === -1) return;
    const count = await repository.count({ where: { organizationId, status: 'active' } });
    if (count >= limit) throw new ForbiddenException('The organization has reached its connected data source limit');
  }

  providers() {
    let quickbooksEnabled = false;
    try { this.providerConfiguration('quickbooks'); this.cipher.assertConfigured(); this.frontendUrl(); quickbooksEnabled = true; } catch { /* unavailable configuration is advertised below */ }
    return [
      { id: 'quickbooks', name: 'QuickBooks Online', description: 'Intuit QuickBooks accounting software', supported: quickbooksEnabled },
      { id: 'xero', name: 'Xero', description: 'Provider integration is not configured', supported: false },
      { id: 'sage', name: 'Sage', description: 'Provider integration is not configured', supported: false },
      { id: 'freshbooks', name: 'FreshBooks', description: 'Provider integration is not configured', supported: false },
      { id: 'wave', name: 'Wave', description: 'Provider integration is not configured', supported: false },
    ];
  }

  redirectUrl(provider: string, result?: ConnectionView): string {
    const target = new URL('/app/connections', this.frontendUrl());
    target.searchParams.set('provider', provider);
    if (result) {
      target.searchParams.set('success', 'true');
      target.searchParams.set('datasourceId', result.id);
    } else target.searchParams.set('error', 'Connection authorization failed. Please try again.');
    return target.toString();
  }

  private async authorize(actor: ConnectionActor, write = false): Promise<UserProfileEntity & { organizationId: string; organization: OrganizationEntity }> {
    if (!actor || typeof actor.sub !== 'string' || !actor.sub || typeof actor.organizationId !== 'string' || !actor.organizationId) {
      throw new ForbiddenException('An authenticated organization is required');
    }
    const profile = await this.profiles.findOne({ where: { id: actor.sub, isActive: true }, relations: ['organization'] });
    if (!profile?.organizationId || !profile.organization || profile.organization.deletedAt || profile.organization.tenantId !== actor.organizationId) {
      throw new ForbiddenException('Active membership in the authenticated organization is required');
    }
    if (write && !['owner', 'admin'].includes(profile.role || '')) throw new ForbiddenException('Organization administrator access is required');
    return profile as UserProfileEntity & { organizationId: string; organization: OrganizationEntity };
  }

  private async findConnection(organizationId: string, id: string) {
    if (typeof id !== 'string' || !/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(id)) throw new BadRequestException('Invalid connection identifier');
    const row = await this.connections.findOne({ where: { id, organizationId } });
    if (!row) throw new NotFoundException('Data source connection not found');
    return row;
  }

  private providerConfiguration(provider: string): { redirectUri: string; environment: 'sandbox' | 'production' } {
    if (provider !== 'quickbooks') throw new NotImplementedException('This accounting provider integration is not available');
    for (const key of ['QUICKBOOKS_CLIENT_ID', 'QUICKBOOKS_CLIENT_SECRET', 'QUICKBOOKS_REDIRECT_URI']) {
      const value = this.config.get<string>(key);
      if (!value || /your[_-]|change.me|placeholder/i.test(value)) throw new ServiceUnavailableException('QuickBooks OAuth is not configured');
    }
    const redirectUri = this.config.get<string>('QUICKBOOKS_REDIRECT_URI')!;
    const url = this.parseHttpUrl(redirectUri);
    if (!['/api/datasources/quickbooks/oauth/callback', '/api/v1/datasources/oauth/quickbooks/callback'].includes(url.pathname) || url.search || url.hash) {
      throw new ServiceUnavailableException('QuickBooks callback URL is not configured correctly');
    }
    const environment = this.config.get<string>('QUICKBOOKS_ENVIRONMENT');
    if (environment !== 'sandbox' && environment !== 'production') throw new ServiceUnavailableException('QuickBooks environment must be explicitly configured');
    return { redirectUri, environment };
  }

  private frontendUrl(): string {
    const value = this.config.get<string>('FRONTEND_URL') || this.config.get<string>('WEB_URL') || '';
    const url = this.parseHttpUrl(value);
    if (url.pathname !== '/' || url.search || url.hash) throw new ServiceUnavailableException('Application URL is not configured correctly');
    return url.origin;
  }

  private parseHttpUrl(value: string): URL {
    let url: URL;
    try { url = new URL(value); } catch { throw new ServiceUnavailableException('Application OAuth URLs are not configured'); }
    const localHttp = this.config.get<string>('NODE_ENV') !== 'production' && url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if ((url.protocol !== 'https:' && !localHttp) || url.username || url.password) throw new ServiceUnavailableException('OAuth URLs must use HTTPS');
    return url;
  }

  private validState(value: unknown): value is OAuthState {
    if (!value || typeof value !== 'object') return false;
    const state = value as Partial<OAuthState>;
    return state.version === 1 && state.provider === 'quickbooks' && typeof state.sub === 'string' && !!state.sub &&
      typeof state.email === 'string' && typeof state.organizationId === 'string' && !!state.organizationId &&
      typeof state.tenantId === 'string' && !!state.tenantId && ['sandbox', 'production'].includes(state.environment || '') &&
      typeof state.expiresAt === 'number' && Number.isFinite(state.expiresAt) && state.expiresAt > Date.now() && state.expiresAt <= Date.now() + 600_000;
  }

  private view(row: DataSourceConnectionEntity): ConnectionView {
    return {
      id: row.id, provider: row.provider, name: row.providerAccountName || row.provider,
      companyName: row.providerAccountName, status: row.status === 'active' ? 'connected' : row.status,
      createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), lastSyncAt: row.lastSyncAt?.toISOString(),
    };
  }
}
