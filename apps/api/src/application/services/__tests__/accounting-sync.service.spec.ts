import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { Readable } from 'node:stream';
import { createHash } from 'node:crypto';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { AccountingSyncService } from '../accounting-sync.service';
import { QuickBooksService } from '@infrastructure/adapters/accounting/quickbooks/quickbooks.service';
import { QuickBooksReportLimitError } from '@infrastructure/adapters/accounting/quickbooks/quickbooks-ledger';
import { ConnectionTokenCipher } from '@infrastructure/auth/connection-token';
import { OrganizationEntity } from '@infrastructure/persistence/postgres/entities/organization.entity';
import { DataSourceConnectionEntity } from '@infrastructure/persistence/postgres/entities/data-source-connection.entity';
import { ledgerFixture } from '@__fixtures__/providers/quickbooks/ledger-fixture';
import { CommittedAccountingSnapshot, getCommittedAccountingSnapshot, readCommittedAccountingDataset } from '@infrastructure/services/committed-accounting-snapshot';
import { GoldDataReader } from '@infrastructure/services/gold-data-reader';

const ORG = '11111111-1111-4111-8111-111111111111';
const CONNECTION = '22222222-2222-4222-8222-222222222222';
const FOREIGN = '33333333-3333-4333-8333-333333333333';
const TENANT = 'fixture-ledger';
type Row = Record<string, any>;

/** Stateful transaction double; real PostgreSQL/S3 qualification runs separately. */
function memoryDatabase(config: ConfigService, events: string[]) {
  const cipher = new ConnectionTokenCipher(config);
  let state = {
    organization: { id: ORG, tenantId: TENANT, currency: 'CAD', fiscalYearEndMonth: 12, name: 'Fixture ledger' } as Row,
    connection: {
      id: CONNECTION, organizationId: ORG, provider: 'quickbooks', providerCompanyId: '123', providerAccountId: '123', status: 'active',
      accessTokenEncrypted: cipher.encrypt('fixture-access', `${ORG}:${CONNECTION}:access`), refreshTokenEncrypted: cipher.encrypt('fixture-refresh', `${ORG}:${CONNECTION}:refresh`),
      tokenExpiresAt: new Date('2026-10-19T12:00:00Z'), refreshTokenExpiresAt: new Date('2027-01-01T00:00:00Z'),
      metadata: { environment: 'sandbox' }, totalSyncs: 0, successfulSyncs: 0, failedSyncs: 0,
    } as Row,
    accounts: [] as Row[], entries: [] as Row[], lines: [] as Row[],
  };
  let backup: typeof state | undefined;
  const clone = <T>(value: T): T => structuredClone(value);
  const options = { lockAvailable: true, conflict: false, failSql: '', commitFailure: false, failTokenSave: false };
  const repositories = new Map<unknown, Row>();
  const repository = (target: unknown) => {
    if (repositories.has(target)) return repositories.get(target)!;
    const result = {
      findOne: jest.fn(async ({ where }: Row) => {
        const row = target === OrganizationEntity ? state.organization : state.connection;
        if (!row || Object.entries(where).some(([key, value]) => row[key] !== value)) return null;
        return clone(row);
      }),
      createQueryBuilder: jest.fn(() => {
        let changes: Row;
        const query: Row = {
          update: jest.fn(() => query), set: jest.fn((value: Row) => { changes = value; return query; }),
          where: jest.fn(() => query),
          execute: jest.fn(async () => {
            if (options.failTokenSave) return { affected: 0 };
            Object.assign(state.connection, clone(changes)); return { affected: 1 };
          }),
        };
        return query;
      }),
    };
    repositories.set(target, result); return result;
  };
  const runner: Row = {
    manager: { getRepository: repository }, isTransactionActive: false,
    connect: jest.fn(async () => undefined), release: jest.fn(async () => undefined),
    startTransaction: jest.fn(async () => { events.push('db:begin'); backup = clone(state); runner.isTransactionActive = true; }),
    commitTransaction: jest.fn(async () => {
      if (options.commitFailure) throw new Error('fixture commit failed');
      events.push('db:commit'); backup = undefined; runner.isTransactionActive = false;
    }),
    rollbackTransaction: jest.fn(async () => { events.push('db:rollback'); if (backup) state = backup; backup = undefined; runner.isTransactionActive = false; }),
    query: jest.fn(async (sql: string, parameters: any[] = []) => {
      if (options.failSql && sql.includes(options.failSql)) throw new Error('fixture database write failed');
      if (sql.includes('pg_try_advisory_lock')) return [{ locked: options.lockAvailable }];
      if (sql.includes('pg_advisory_unlock')) return [{ pg_advisory_unlock: true }];
      if (sql.includes('AS conflict')) return [{ conflict: options.conflict || state.entries.some((row) => row.organization_id === ORG && row.source !== `QUICKBOOKS:${CONNECTION}` && row.status === 'POSTED') }];
      if (sql.includes('INSERT INTO accounting.accounts')) {
        for (const row of JSON.parse(parameters[0])) { state.accounts = state.accounts.filter((existing) => existing.id !== row.id); state.accounts.push(row); }
        return [];
      }
      if (sql.includes('SET parent_account_id')) {
        for (const row of JSON.parse(parameters[0])) Object.assign(state.accounts.find((account) => account.id === row.id)!, { parent_account_id: row.parent_account_id });
        return [];
      }
      if (sql.startsWith('DELETE FROM accounting.journal_entries')) {
        const removed = new Set(state.entries.filter((entry) => entry.organization_id === parameters[0] && entry.source === parameters[1]).map((entry) => entry.id));
        state.entries = state.entries.filter((entry) => !removed.has(entry.id)); state.lines = state.lines.filter((line) => !removed.has(line.journal_entry_id)); return [];
      }
      if (sql.includes('INSERT INTO accounting.journal_entries')) { state.entries.push(...JSON.parse(parameters[0]).map((row: Row) => ({ ...row, status: 'POSTED' }))); return []; }
      if (sql.includes('INSERT INTO accounting.journal_entry_lines')) { state.lines.push(...JSON.parse(parameters[0])); return []; }
      if (sql.includes('metadata = $3::jsonb')) {
        state.connection.metadata = JSON.parse(parameters[2]); state.connection.lastSyncAt = parameters[3]; state.connection.lastSyncStatus = 'success';
        state.connection.successfulSyncs++; state.connection.totalSyncs++; events.push('db:manifest'); return [];
      }
      if (sql.includes("last_sync_status = 'failed'")) { state.connection.lastSyncStatus = 'failed'; state.connection.failedSyncs++; state.connection.totalSyncs++; return []; }
      throw new Error(`Unexpected fixture SQL: ${sql.slice(0, 75)}`);
    }),
  };
  const database = {
    createQueryRunner: jest.fn(() => runner),
    query: jest.fn(async (_sql: string, parameters: string[]) => parameters[0] === TENANT && state.connection.metadata.accountingSnapshot ? [{ id: CONNECTION, organization_id: ORG, snapshot: clone(state.connection.metadata.accountingSnapshot) }] : []),
  };
  return { database: database as unknown as DataSource, runner, options, repository, get state() { return state; } };
}

describe('AccountingSyncService publication and isolation', () => {
  let config: ConfigService, db: ReturnType<typeof memoryDatabase>, provider: Row, fixture: ReturnType<typeof ledgerFixture>, events: string[], service: AccountingSyncService;
  let objects: Map<string, string>, s3Send: jest.SpyInstance;
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-10-19T10:00:00Z'), doNotFake: ['nextTick', 'setImmediate'] });
    config = new ConfigService({ CONNECTION_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'), QUICKBOOKS_ENVIRONMENT: 'sandbox', AWS_ACCESS_KEY_ID: 'fixture', AWS_SECRET_ACCESS_KEY: 'fixture', S3_BUCKET_GOLD: 'fixture-gold', S3_ENDPOINT: 'http://127.0.0.1:9000' });
    fixture = ledgerFixture(); events = []; db = memoryDatabase(config, events); objects = new Map();
    provider = {
      getAccountingPreferences: jest.fn(async () => ({ homeCurrency: 'CAD', multiCurrency: false })),
      getCompanyInfo: jest.fn(async () => ({ companyName: 'Fixture ledger', fiscalYearStartMonth: 'January' })),
      getLedgerAccounts: jest.fn(async () => structuredClone(fixture.accounts)),
      getGeneralLedger: jest.fn(async () => structuredClone(fixture.generalLedger)),
      getTrialBalance: jest.fn(async () => structuredClone(fixture.trial)),
      refreshTokens: jest.fn(async () => ({ accessToken: 'fixture-access-refreshed', refreshToken: 'fixture-refresh-rotated', accessTokenExpiresAt: new Date('2026-10-19T12:00:00Z'), refreshTokenExpiresAt: new Date('2027-01-01T00:00:00Z') })),
    };
    s3Send = jest.spyOn(S3Client.prototype, 'send').mockImplementation((async (command: PutObjectCommand | GetObjectCommand) => {
      const key = command.input.Key!;
      if (command instanceof PutObjectCommand) {
        events.push('s3:put');
        if (objects.has(key)) throw new Error('fixture immutable key collision');
        const body = String(command.input.Body);
        expect(command.input.IfNoneMatch).toBe('*');
        expect(command.input.ContentMD5).toBe(createHash('md5').update(body).digest('base64'));
        objects.set(key, body); return { ETag: 'fixture' };
      }
      events.push('s3:get');
      const body = objects.get(key);
      if (body === undefined) throw Object.assign(new Error('missing'), { name: 'NoSuchKey', $metadata: { httpStatusCode: 404 } });
      return { ContentLength: Buffer.byteLength(body), Body: Readable.from([Buffer.from(body)]) };
    }) as any);
    service = new AccountingSyncService(db.database, config, provider as unknown as QuickBooksService);
  });
  afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });
  const sync = () => service.sync(CONNECTION, ORG, TENANT);
  it('persists real balanced journals, private Gold objects and one committed manifest', async () => {
    const result = await sync();
    expect(result).toMatchObject({ success: true, stats: { accountsSynced: 6, transactionsSynced: 5, ledgerLinesSynced: 11 }, coverage: { startDate: '1900-01-01', endDate: '2026-10-19', accountingMethod: 'Accrual', currency: 'CAD' } });
    expect(result.stats).not.toHaveProperty('contactsSynced'); expect(result.stats).not.toHaveProperty('invoicesSynced');
    expect(db.state.entries).toHaveLength(5); expect(db.state.lines).toHaveLength(11); expect(db.state.accounts).toHaveLength(6);
    expect(db.state.connection.lastSyncStatus).toBe('success');
    const manifest = db.state.connection.metadata.accountingSnapshot as CommittedAccountingSnapshot;
    expect(manifest.runId).toBe(result.runId); expect(objects.size).toBe(2);
    expect(events.indexOf('db:begin')).toBeGreaterThan(events.lastIndexOf('s3:get'));
    expect(events.slice(-2)).toEqual(['db:manifest', 'db:commit']);
    expect(db.runner.query).toHaveBeenCalledWith('SELECT pg_try_advisory_lock(hashtextextended($1, 0)) AS locked', [`accounting-sync:${ORG}`]);
    const reader = new GoldDataReader(new S3Client({}), 'fixture-gold');
    expect(await getCommittedAccountingSnapshot(db.database, TENANT)).toEqual(manifest);
    const gold = await readCommittedAccountingDataset<Row>(reader, manifest, 'fact_transaction');
    expect(gold).toHaveLength(11);
    expect(gold.every((row) => row.organization_key === TENANT && db.state.accounts.some((account) => account.id === row.account_key))).toBe(true);
    expect(gold.map((row) => row.transaction_key).sort()).toEqual(db.state.lines.map((row) => row.id).sort());
    for (const entry of db.state.entries) {
      const cents = db.state.lines.filter((line) => line.journal_entry_id === entry.id).reduce((sum, line) => sum + Math.round(Number(line.debit_amount) * 100) - Math.round(Number(line.credit_amount) * 100), 0);
      expect(cents).toBe(0);
    }
  });
  it('repeated sync does not duplicate ledger entries or posting IDs', async () => {
    const first = await sync(); const ids = db.state.lines.map((line) => line.id).sort();
    const second = await sync();
    expect(second.runId).not.toBe(first.runId); expect(db.state.entries).toHaveLength(5);
    expect(db.state.lines.map((line) => line.id).sort()).toEqual(ids); expect(objects.size).toBe(4);
  });
  it('a confirmed empty replacement removes deleted source transactions without falling back to old files', async () => {
    await sync();
    fixture.generalLedger.Rows = {}; fixture.generalLedger.Header.Option![0].Value = 'true';
    fixture.trial.Rows = {}; fixture.trial.Header.Option![0].Value = 'true';
    const result = await sync(); expect(result.stats.transactionsSynced).toBe(0); expect(db.state.lines).toHaveLength(0); expect(db.state.entries).toHaveLength(0);
    expect(await readCommittedAccountingDataset(new GoldDataReader(new S3Client({}), 'fixture-gold'), db.state.connection.metadata.accountingSnapshot, 'fact_transaction')).toEqual([]);
  });
  it('keeps the previous valid snapshot when a second upload fails', async () => {
    await sync(); const old = structuredClone(db.state);
    const implementation = s3Send.getMockImplementation()!;
    let puts = 0;
    s3Send.mockImplementation(((command: PutObjectCommand | GetObjectCommand) => {
      if (command instanceof PutObjectCommand && ++puts === 2) throw new Error('fixture storage unavailable with private details');
      return implementation(command);
    }) as any);
    await expect(sync()).rejects.toThrow('Accounting sync could not complete');
    expect(db.state.connection.metadata.accountingSnapshot).toEqual(old.connection.metadata.accountingSnapshot);
    expect(db.state.entries).toEqual(old.entries); expect(db.state.lines).toEqual(old.lines);
    expect(db.state.connection.lastSyncStatus).toBe('failed');
  });
  it('rejects corrupted read-back before beginning the publication transaction', async () => {
    const implementation = s3Send.getMockImplementation()!;
    s3Send.mockImplementation(((command: PutObjectCommand | GetObjectCommand) => {
      if (command instanceof GetObjectCommand) return Promise.resolve({ Body: Readable.from([Buffer.from('[]')]), ContentLength: 2 });
      return implementation(command);
    }) as any);
    await expect(sync()).rejects.toThrow('integrity check');
    expect(db.runner.startTransaction).not.toHaveBeenCalled(); expect(db.state.connection.metadata.accountingSnapshot).toBeUndefined();
  });
  it('rolls back accounts and journals and retains the old manifest if a line write fails', async () => {
    await sync(); const old = structuredClone(db.state);
    db.options.failSql = 'INSERT INTO accounting.journal_entry_lines';
    await expect(sync()).rejects.toThrow('could not complete');
    expect(db.runner.rollbackTransaction).toHaveBeenCalled(); expect(db.state.accounts).toEqual(old.accounts);
    expect(db.state.entries).toEqual(old.entries); expect(db.state.lines).toEqual(old.lines);
    expect(db.state.connection.metadata.accountingSnapshot).toEqual(old.connection.metadata.accountingSnapshot);
  });
  it('rolls back a rejected commit without acknowledging success', async () => {
    db.options.commitFailure = true;
    await expect(sync()).rejects.toThrow('could not complete');
    expect(db.state.entries).toEqual([]); expect(db.state.connection.metadata.accountingSnapshot).toBeUndefined();
  });
  it('preserves foreign tenant data while replacing only the selected provider source', async () => {
    db.state.entries.push({ id: 'foreign', organization_id: FOREIGN, source: 'MANUAL', status: 'POSTED' });
    db.state.lines.push({ id: 'foreign-line', journal_entry_id: 'foreign', account_id: 'foreign-account', debit_amount: '0.00', credit_amount: '0.00' });
    await sync(); expect(db.state.entries.some((row) => row.id === 'foreign')).toBe(true); expect(db.state.lines.some((row) => row.id === 'foreign-line')).toBe(true);
  });
  it.each([[FOREIGN, ORG, TENANT], [CONNECTION, FOREIGN, TENANT], [CONNECTION, ORG, 'different-tenant']])('does not fetch provider data for a mismatched source or tenant %p', async (id, org, tenant) => {
    await expect(service.sync(id, org, tenant)).rejects.toThrow('not found');
    expect(provider.getGeneralLedger).not.toHaveBeenCalled(); expect(objects.size).toBe(0);
  });
  it('rejects duplicate concurrent sync before any provider or storage work', async () => {
    db.options.lockAvailable = false;
    await expect(sync()).rejects.toThrow('already running'); expect(provider.getCompanyInfo).not.toHaveBeenCalled();
    expect(db.runner.release).toHaveBeenCalled();
  });
  it('refuses to mix a pre-existing manual posted ledger with the imported provider data', async () => {
    db.state.entries.push({ id: 'manual', organization_id: ORG, source: 'MANUAL', status: 'POSTED' });
    await expect(sync()).rejects.toThrow('source migration'); expect(provider.getGeneralLedger).not.toHaveBeenCalled();
    expect(db.state.entries).toHaveLength(1);
  });
  it.each([
    ['disconnected', (state: Row) => { state.connection.status = 'disconnected'; }],
    ['realm mismatch', (state: Row) => { state.connection.providerAccountId = '456'; }],
    ['environment mismatch', (state: Row) => { state.connection.metadata.environment = 'production'; }],
    ['currency mismatch', (state: Row) => { state.organization.currency = 'USD'; }],
    ['fiscal mismatch', (state: Row) => { state.organization.fiscalYearEndMonth = 3; }],
    ['deleted organization', (state: Row) => { state.organization.deletedAt = new Date(); }],
  ])('blocks %s state before publishing anything', async (_, alter) => {
    (alter as (state: Row) => void)(db.state); await expect(sync()).rejects.toThrow(); expect(objects.size).toBe(0); expect(db.state.entries).toEqual([]);
  });
  it('blocks an unbalanced source before storage or ledger writes', async () => {
    fixture.generalLedger.Rows.Row![0].Rows!.Row![0].ColData![4].value = '99.99';
    await expect(sync()).rejects.toThrow('not balanced'); expect(objects.size).toBe(0); expect(db.runner.startTransaction).not.toHaveBeenCalled();
  });
  it('does not publish when accounts change during provider reads', async () => {
    provider.getLedgerAccounts.mockResolvedValueOnce(fixture.accounts).mockResolvedValueOnce([...fixture.accounts, { ...fixture.accounts[0], Id: 'new' }]);
    await expect(sync()).rejects.toThrow('changed during sync'); expect(objects.size).toBe(0);
  });
  it('detects a disconnect after S3 staging and leaves the prior ledger untouched', async () => {
    const original = db.runner.startTransaction.getMockImplementation()!;
    db.runner.startTransaction.mockImplementation(async () => { db.state.connection.status = 'disconnected'; await original(); });
    await expect(sync()).rejects.toThrow('Reconnect'); expect(db.state.entries).toEqual([]); expect(db.state.connection.metadata.accountingSnapshot).toBeUndefined();
  });
  it('refreshes and encrypts rotated credentials before data reads', async () => {
    db.state.connection.tokenExpiresAt = new Date('2026-10-19T09:00:00Z');
    const previous = db.state.connection.refreshTokenEncrypted;
    await sync();
    expect(provider.refreshTokens).toHaveBeenCalledWith('fixture-refresh');
    expect(db.state.connection.refreshTokenEncrypted).not.toBe(previous);
    expect(new ConnectionTokenCipher(config).decrypt(db.state.connection.refreshTokenEncrypted, `${ORG}:${CONNECTION}:refresh`)).toBe('fixture-refresh-rotated');
    expect(provider.getGeneralLedger.mock.calls[0][0]).toBe('fixture-access-refreshed');
    expect(JSON.stringify(db.state.connection)).not.toContain('fixture-refresh-rotated');
  });
  it('retains rotated credentials after a later validation failure', async () => {
    db.state.connection.tokenExpiresAt = new Date('2026-10-19T09:00:00Z');
    provider.getTrialBalance.mockRejectedValue(new Error('provider unavailable'));
    await expect(sync()).rejects.toThrow('could not complete');
    expect(new ConnectionTokenCipher(config).decrypt(db.state.connection.refreshTokenEncrypted, `${ORG}:${CONNECTION}:refresh`)).toBe('fixture-refresh-rotated');
    expect(db.state.entries).toEqual([]);
  });
  it('does not persist a refreshed credential over concurrent reconnect/disconnect changes', async () => {
    db.state.connection.tokenExpiresAt = new Date('2026-10-19T09:00:00Z'); db.options.failTokenSave = true;
    await expect(sync()).rejects.toThrow('authorization changed'); expect(provider.getGeneralLedger).not.toHaveBeenCalled();
  });
  it('requires reconnect after refresh expiry', async () => {
    db.state.connection.tokenExpiresAt = new Date('2026-10-19T09:00:00Z'); db.state.connection.refreshTokenExpiresAt = new Date('2026-10-01T00:00:00Z');
    await expect(sync()).rejects.toThrow('authorization expired'); expect(provider.refreshTokens).not.toHaveBeenCalled();
  });
  it('rejects copied credentials encrypted for a foreign organization', async () => {
    db.state.connection.accessTokenEncrypted = new ConnectionTokenCipher(config).encrypt('foreign-access', `${FOREIGN}:${CONNECTION}:access`);
    await expect(sync()).rejects.toThrow('could not complete'); expect(provider.getCompanyInfo).not.toHaveBeenCalled();
  });
  it('splits an oversized report into disjoint date ranges before reconciling all data', async () => {
    provider.getGeneralLedger.mockImplementation(async (_token: string, _realm: string, start: string, end: string) => {
      if (start === fixture.scope.startDate && end === fixture.scope.endDate) throw new QuickBooksReportLimitError();
      const report = structuredClone(fixture.generalLedger); report.Header.StartPeriod = start; report.Header.EndPeriod = end;
      for (const section of report.Rows.Row!) section.Rows!.Row = section.Rows!.Row!.filter((row) => row.ColData![0].value >= start && row.ColData![0].value <= end);
      if (!report.Rows.Row!.some((section) => section.Rows!.Row!.length)) report.Header.Option![0].Value = 'true';
      return report;
    });
    expect((await sync()).stats.ledgerLinesSynced).toBe(11);
    expect(provider.getGeneralLedger).toHaveBeenCalledTimes(3);
  });
  it('bounds pathological oversized responses without publishing a partial dataset', async () => {
    provider.getGeneralLedger.mockRejectedValue(new QuickBooksReportLimitError());
    await expect(sync()).rejects.toThrow('supported size'); expect(provider.getGeneralLedger.mock.calls.length).toBeLessThan(129);
    expect(objects.size).toBe(0); expect(db.state.entries).toEqual([]);
  });
});
