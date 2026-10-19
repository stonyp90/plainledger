#!/usr/bin/env node
'use strict';

// Real, private S3/Postgres/Redis I/O with synthetic accounting source responses.
// Never import AppModule or invoke a live accounting provider from this harness.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { createHash } = require('node:crypto');
const apiRoot = path.join(__dirname, '../apps/api');
const apiRequire = createRequire(path.join(apiRoot, 'package.json'));
apiRequire('reflect-metadata');
const { DataSource } = apiRequire('typeorm');
const { ConfigService } = apiRequire('@nestjs/config');
const { S3Client, CreateBucketCommand, HeadBucketCommand, PutObjectCommand, ListObjectsV2Command } = apiRequire('@aws-sdk/client-s3');
const built = (relative) => apiRequire(path.join(apiRoot, 'dist', relative));

const FIXTURE_A = { id: '51510000-0000-4000-8000-000000000001', tenant: 'storage-sync-fixture-a', connection: '51510000-0000-4000-8000-000000001001' };
const FIXTURE_B = { id: '51510000-0000-4000-8000-000000000002', tenant: 'storage-sync-fixture-b', connection: '51510000-0000-4000-8000-000000001002' };
const results = [];
let database, cache, s3, syncService;

function guard() {
  if (process.env.CI !== 'true' || !['localhost', '127.0.0.1'].includes(process.env.DATABASE_HOST) ||
      process.env.DATABASE_PASSWORD !== 'isolated-e2e-only' || !['localhost', '127.0.0.1'].includes(process.env.REDIS_HOST) ||
      process.env.S3_ENDPOINT !== 'http://127.0.0.1:19000' || process.env.S3_BUCKET_GOLD !== 'plainledger-e2e' ||
      !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error('Refusing storage fixtures outside the disposable CI database, Redis and loopback S3 endpoint.');
  }
}
function entityFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? entityFiles(absolute) : entry.name.endsWith('.entity.js') ? [absolute] : [];
  });
}
async function check(name, work) {
  await work(); results.push({ name, status: 'passed' }); console.log(`Storage check passed: ${name}`);
}
async function put(key, value, raw = false) {
  const body = raw ? value : JSON.stringify(value);
  await s3.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET_GOLD, Key: key, Body: body, ContentType: 'application/json' }));
}
async function mapLimit(items, limit, work) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) { const index = next++; await work(items[index], index); }
  }));
}
async function seedConnection(subject, config) {
  const { ConnectionTokenCipher } = built('infrastructure/auth/connection-token.js');
  const cipher = new ConnectionTokenCipher(config), prefix = `${subject.id}:${subject.connection}`;
  const exists = await database.query('SELECT id FROM accounting.organizations WHERE id=$1 OR tenant_id=$2', [subject.id, subject.tenant]);
  assert.equal(exists.length, 0, 'Storage sync fixture already exists; use a fresh CI database');
  await database.transaction(async (manager) => {
    await manager.query("INSERT INTO accounting.organizations(id,tenant_id,name,currency,fiscal_year_end_month,subscription_plan_id) VALUES($1,$2,$3,'CAD',12,'professional')", [subject.id, subject.tenant, `Isolated ${subject.tenant}`]);
    await manager.query(`INSERT INTO accounting.data_source_connections
      (id,organization_id,provider,status,provider_account_id,provider_company_id,access_token_encrypted,refresh_token_encrypted,token_expires_at,refresh_token_expires_at,metadata)
      VALUES($1,$2,'quickbooks','active','123','123',$3,$4,$5,$6,'{"environment":"sandbox"}')`,
      [subject.connection, subject.id, cipher.encrypt('isolated-source-access', `${prefix}:access`), cipher.encrypt('isolated-source-refresh', `${prefix}:refresh`), new Date(Date.now() + 3_600_000), new Date(Date.now() + 86_400_000)]);
  });
}
async function materializeExistingLedger(tenant) {
  const organizations = await database.query('SELECT id,currency FROM accounting.organizations WHERE tenant_id=$1 AND deleted_at IS NULL', [tenant]);
  if (!organizations.length) return; // This harness can run in its own empty test job.
  const org = organizations[0];
  const accounts = await database.query('SELECT * FROM accounting.accounts WHERE organization_id=$1 ORDER BY code,id', [org.id]);
  const postings = await database.query(`SELECT l.*, e.id AS entry_id, e.entry_date::text AS date, e.reference, e.source
    FROM accounting.journal_entry_lines l JOIN accounting.journal_entries e ON e.id=l.journal_entry_id
    JOIN accounting.accounts a ON a.id=l.account_id AND a.organization_id=e.organization_id
    WHERE e.organization_id=$1 AND e.status='POSTED' ORDER BY e.entry_date,e.id,l.id`, [org.id]);
  await put(`${tenant}/dim_account.json`, accounts.map((account) => ({
    organization_key: tenant, account_key: account.id, account_id: account.id, source_account_id: account.id,
    account_code: account.code, account_name: account.name, account_type: account.account_type, account_subtype: account.account_subtype || '',
    is_active: account.is_active, is_debit_normal: ['ASSET', 'EXPENSE'].includes(account.account_type), hierarchy_level: 0, hierarchy_path: account.name,
    balance_sheet_section: null, income_statement_section: null,
  })));
  await put(`${tenant}/fact_transaction.json`, postings.map((line) => ({
    organization_key: tenant, transaction_key: line.id, transaction_id: line.entry_id, account_key: line.account_id, date_key: Number(line.date.replace(/-/g, '')),
    transaction_date: line.date, posting_date: line.date, debit_amount: Number(line.debit_amount), credit_amount: Number(line.credit_amount), amount: Number(line.debit_amount) - Number(line.credit_amount),
    currency_code: org.currency, exchange_rate: 1, amount_cad: Number(line.debit_amount) - Number(line.credit_amount), reference_number: line.reference || '', memo: line.description || '',
    source_system: 'ISOLATED_SQL_FIXTURE', source_transaction_id: line.entry_id, transaction_type_key: 'JournalEntry', contact_key: null,
  })));
  await put(`${tenant}/dim_contact.json`, []); await put(`${tenant}/fact_account_balance.json`, []);
  results.push({ name: `Materialized posted SQL ledger for ${tenant}`, status: 'passed', accounts: accounts.length, postings: postings.length });
}

async function main() {
  guard();
  const { GoldDataReader } = built('infrastructure/services/gold-data-reader.js');
  const { getCommittedAccountingSnapshot, readCommittedAccountingDataset } = built('infrastructure/services/committed-accounting-snapshot.js');
  const { AccountingSyncService } = built('application/services/accounting-sync.service.js');
  const { DatalakeDataService } = built('infrastructure/services/datalake-data.service.js');
  const { CacheService } = built('infrastructure/cache/cache.service.js');
  const { LedgerReportRepository } = built('infrastructure/persistence/postgres/ledger-report.repository.js');
  const { ledgerFixture } = built('__fixtures__/providers/quickbooks/ledger-fixture.js');
  const config = new ConfigService({ ...process.env, QUICKBOOKS_ENVIRONMENT: 'sandbox', REDIS_TLS: 'false',
    CONNECTION_TOKEN_ENCRYPTION_KEY: process.env.CONNECTION_TOKEN_ENCRYPTION_KEY || Buffer.alloc(32, 11).toString('base64') });
  const entities = entityFiles(path.join(apiRoot, 'dist')).flatMap((file) => Object.values(apiRequire(file)).filter((value) => typeof value === 'function' && value.name.endsWith('Entity')));
  database = new DataSource({ type: 'postgres', host: process.env.DATABASE_HOST, port: Number(process.env.DATABASE_PORT || '5432'), username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD, database: process.env.DATABASE_NAME, ssl: false, entities, synchronize: false, logging: false, extra: { max: 4 }, installExtensions: false });
  await database.initialize();
  const marker = await database.query("SELECT version FROM platform.schema_bootstrap WHERE version='plainledger-initial-20261019'");
  assert.equal(marker.length, 1, 'Run the guarded empty-database bootstrap before this harness');
  s3 = new S3Client({ endpoint: process.env.S3_ENDPOINT, forcePathStyle: true, region: process.env.S3_REGION || 'us-east-1',
    credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY }, requestHandler: { connectionTimeout: 5000, requestTimeout: 30_000 } });
  try { await s3.send(new CreateBucketCommand({ Bucket: process.env.S3_BUCKET_GOLD })); }
  catch (error) { if (!['BucketAlreadyOwnedByYou', 'BucketAlreadyExists'].includes(error.name)) throw error; }
  await s3.send(new HeadBucketCommand({ Bucket: process.env.S3_BUCKET_GOLD }));
  const prior = await s3.send(new ListObjectsV2Command({ Bucket: process.env.S3_BUCKET_GOLD, MaxKeys: 1 }));
  assert.equal(prior.KeyCount || 0, 0, 'Refusing to reuse a bucket containing prior data');
  cache = new CacheService(config); await cache.onModuleInit();
  assert.equal(await cache.healthCheck(), true, 'Real Redis must be available; no cache fallback qualifies this harness');
  const reader = new GoldDataReader(s3, process.env.S3_BUCKET_GOLD);
  await seedConnection(FIXTURE_A, config); await seedConnection(FIXTURE_B, config);

  await check('empty prefixes and absent canonical files', async () => {
    assert.deepEqual(await reader.readTenantSnapshot(`dim_account/${FIXTURE_A.tenant}/`, FIXTURE_A.tenant), []);
    assert.equal(await reader.readTenantFile(`${FIXTURE_A.tenant}/missing.json`, FIXTURE_A.tenant), null);
  });
  const prefix = `cases/${FIXTURE_A.tenant}/pagination/`;
  await check('S3 pagination reads all 1,005 partitions', async () => {
    await mapLimit(Array.from({ length: 1005 }, (_, index) => index), 12, async (index) => put(`${prefix}partition-${String(index).padStart(5, '0')}/00001.json`, [{ organization_key: FIXTURE_A.tenant, transaction_key: `posting-${index}`, amount: index }]));
    await put(`${prefix}ignore.txt`, 'not a dataset', true);
    let pages = 0;
    const counted = { send: (command) => { if (command instanceof ListObjectsV2Command) pages++; return s3.send(command); } };
    const paginatedReader = new GoldDataReader(counted, process.env.S3_BUCKET_GOLD);
    const rows = await paginatedReader.readTenantTransactions(prefix, FIXTURE_A.tenant);
    assert.equal(rows.length, 1005); assert.ok(pages >= 2); assert.equal(new Set(rows.map((row) => row.transaction_key)).size, 1005);
  });
  await check('excessive file and aggregate row counts fail explicitly', async () => {
    await assert.rejects(() => new GoldDataReader(s3, process.env.S3_BUCKET_GOLD, { maxFiles: 1000 }).readTenantTransactions(prefix, FIXTURE_A.tenant), /limit/);
    await assert.rejects(() => new GoldDataReader(s3, process.env.S3_BUCKET_GOLD, { maxRows: 2 }).readTenantTransactions(prefix, FIXTURE_A.tenant), /limit/);
  });
  await check('new full snapshots remove deleted records and do not resurrect archived rows', async () => {
    const directory = `cases/${FIXTURE_A.tenant}/snapshots/`;
    await put(`${directory}00001.json`, [{ organization_key: FIXTURE_A.tenant, transaction_key: 'removed' }]);
    await put(`${directory}00002.json`, []);
    assert.deepEqual(await reader.readTenantTransactions(directory, FIXTURE_A.tenant), []);
  });
  await check('duplicate posting keys, wrong tenants and missing tenant keys are rejected', async () => {
    const directory = `cases/${FIXTURE_A.tenant}/invalid/`;
    await put(`${directory}duplicate.json`, [{ organization_key: FIXTURE_A.tenant, transaction_key: 'repeat' }, { organization_key: FIXTURE_A.tenant, transaction_key: 'repeat' }]);
    await assert.rejects(() => reader.readTenantTransactions(`${directory}duplicate.json`, FIXTURE_A.tenant), /duplicate/);
    await put(`${directory}foreign.json`, [{ organization_key: FIXTURE_B.tenant, transaction_key: 'foreign' }]);
    await assert.rejects(() => reader.readTenantFile(`${directory}foreign.json`, FIXTURE_A.tenant), /organization/);
    await put(`${directory}unscoped.json`, [{ transaction_key: 'unscoped' }]);
    await assert.rejects(() => reader.readTenantFile(`${directory}unscoped.json`, FIXTURE_A.tenant), /organization/);
  });
  await check('invalid JSON, scalar payloads and oversized objects are not empty states', async () => {
    const key = `cases/${FIXTURE_A.tenant}/malformed.json`;
    await put(key, '{invalid', true); await assert.rejects(() => reader.readTenantFile(key, FIXTURE_A.tenant), /JSON/);
    await put(key, { organization_key: FIXTURE_A.tenant }); await assert.rejects(() => reader.readTenantFile(key, FIXTURE_A.tenant), /array/);
    await put(key, [{ organization_key: FIXTURE_A.tenant, payload: 'x'.repeat(2048) }]);
    await assert.rejects(() => new GoldDataReader(s3, process.env.S3_BUCKET_GOLD, { maxObjectBytes: 1024 }).readTenantFile(key, FIXTURE_A.tenant), /limit/);
  });

  const fixture = ledgerFixture(), today = new Date().toISOString().slice(0, 10);
  // Keep generated postings inside the current fiscal year on every future CI run.
  fixture.generalLedger.Header.EndPeriod = today; fixture.trial.Header.EndPeriod = today;
  for (const section of fixture.generalLedger.Rows.Row) for (const row of section.Rows.Row) row.ColData[0].value = today;
  const provider = {
    getAccountingPreferences: async () => ({ homeCurrency: 'CAD', multiCurrency: false }),
    getCompanyInfo: async () => ({ companyName: 'Isolated source', fiscalYearStartMonth: 'January' }),
    getLedgerAccounts: async () => structuredClone(fixture.accounts), getGeneralLedger: async () => structuredClone(fixture.generalLedger),
    getTrialBalance: async () => structuredClone(fixture.trial), refreshTokens: async () => { throw new Error('Unexpected fixture token refresh'); },
  };
  syncService = new AccountingSyncService(database, config, provider);
  const datalake = new DatalakeDataService(config, cache, database);
  const synchronize = (subject) => syncService.sync(subject.connection, subject.id, subject.tenant);
  const state = async (subject) => ({
    manifest: await getCommittedAccountingSnapshot(database, subject.tenant),
    journals: await database.query('SELECT id,entry_number,entry_date::text,source FROM accounting.journal_entries WHERE organization_id=$1 ORDER BY id', [subject.id]),
    lines: await database.query('SELECT l.id,l.account_id,l.debit_amount::text,l.credit_amount::text FROM accounting.journal_entry_lines l JOIN accounting.journal_entries e ON e.id=l.journal_entry_id WHERE e.organization_id=$1 ORDER BY l.id', [subject.id]),
  });
  let first;
  await check('real sync publishes balanced PostgreSQL journals and readable immutable S3 snapshots', async () => {
    const result = await synchronize(FIXTURE_A); assert.equal(result.success, true); assert.equal(result.stats.transactionsSynced, 5); assert.equal(result.stats.ledgerLinesSynced, 11);
    first = await state(FIXTURE_A); assert.equal(first.journals.length, 5); assert.equal(first.lines.length, 11);
    const rows = await readCommittedAccountingDataset(reader, first.manifest, 'fact_transaction'); assert.equal(rows.length, 11);
    assert.deepEqual(rows.map((row) => row.transaction_key).sort(), first.lines.map((line) => line.id).sort());
    const invalid = await database.query(`SELECT e.id FROM accounting.journal_entries e LEFT JOIN accounting.journal_entry_lines l ON l.journal_entry_id=e.id
      WHERE e.organization_id=$1 GROUP BY e.id HAVING COUNT(l.id)=0 OR SUM(l.debit_amount)<>SUM(l.credit_amount)`, [FIXTURE_A.id]);
    assert.equal(invalid.length, 0);
    const totals = await new LedgerReportRepository(database).getTotals(FIXTURE_A.id, new Date(`${today}T23:59:59Z`));
    assert.equal(totals.hasPostedEntries, true); assert.equal(totals.accounts.length, 6);
  });
  await check('API data service reads committed snapshots and preserves credits, reversals and negative balances', async () => {
    await put(`${FIXTURE_A.tenant}/fact_transaction.json`, [{ organization_key: FIXTURE_B.tenant, transaction_key: 'stale-foreign-fallback' }]);
    const dashboard = await datalake.getDashboardData(FIXTURE_A.tenant);
    assert.equal(dashboard.transactions.length, 11); assert.equal(dashboard.summary.totalRevenue, 80); assert.equal(dashboard.summary.totalExpenses, 65);
    assert.equal(dashboard.summary.netIncome, 15); assert.equal(dashboard.summary.cashBalance, 35); assert.equal(dashboard.summary.accountsReceivable, -20);
  });
  await check('repeated sync replaces only its own source and preserves deterministic posting IDs', async () => {
    await synchronize(FIXTURE_A); const second = await state(FIXTURE_A);
    assert.notEqual(second.manifest.runId, first.manifest.runId); assert.deepEqual(second.journals, first.journals); assert.deepEqual(second.lines, first.lines);
    first = second;
  });
  await check('real database rejects cross-tenant connection access before source reads', async () => {
    await assert.rejects(() => syncService.sync(FIXTURE_A.connection, FIXTURE_B.id, FIXTURE_B.tenant), /not found/);
    assert.equal(await getCommittedAccountingSnapshot(database, FIXTURE_B.tenant), null);
  });
  await check('two independently persisted tenant snapshots never share records or account identities', async () => {
    await synchronize(FIXTURE_B); const foreign = await state(FIXTURE_B);
    const rows = await readCommittedAccountingDataset(reader, foreign.manifest, 'fact_transaction');
    assert.ok(rows.every((row) => row.organization_key === FIXTURE_B.tenant));
    assert.ok(rows.every((row) => !first.lines.some((line) => line.id === row.transaction_key)));
    const own = await datalake.getDashboardData(FIXTURE_A.tenant); assert.equal(own.transactions.length, 11); assert.ok(own.transactions.every((row) => row.organization_key === FIXTURE_A.tenant));
  });
  await check('partial real S3 staging cannot supersede the committed manifest', async () => {
    const original = syncService.s3.send.bind(syncService.s3); let puts = 0;
    syncService.s3.send = (command) => {
      if (command instanceof PutObjectCommand && ++puts === 2) throw new Error('Injected fixture failure after one real upload');
      return original(command);
    };
    try { await assert.rejects(() => synchronize(FIXTURE_A), /could not complete/); }
    finally { syncService.s3.send = original; }
    assert.deepEqual(await state(FIXTURE_A), first);
  });
  await check('a real PostgreSQL transaction rolls back after injected journal-line failure', async () => {
    const original = database.createQueryRunner.bind(database);
    database.createQueryRunner = (...args) => {
      const runner = original(...args), query = runner.query.bind(runner);
      runner.query = (sql, ...rest) => { if (sql.includes('INSERT INTO accounting.journal_entry_lines')) throw new Error('Injected fixture line-write failure'); return query(sql, ...rest); };
      return runner;
    };
    try { await assert.rejects(() => synchronize(FIXTURE_A), /could not complete/); }
    finally { database.createQueryRunner = original; }
    assert.deepEqual(await state(FIXTURE_A), first);
  });
  await check('an empty replacement removes source rows and invalidates the prior cached snapshot', async () => {
    const foreignBefore = await state(FIXTURE_B);
    fixture.generalLedger.Rows = {}; fixture.generalLedger.Header.Option[0].Value = 'true';
    fixture.trial.Rows = {}; fixture.trial.Header.Option[0].Value = 'true';
    const result = await synchronize(FIXTURE_A); assert.equal(result.stats.transactionsSynced, 0);
    const empty = await state(FIXTURE_A); assert.equal(empty.journals.length, 0); assert.equal(empty.lines.length, 0);
    assert.deepEqual(await readCommittedAccountingDataset(reader, empty.manifest, 'fact_transaction'), []);
    const dashboard = await datalake.getDashboardData(FIXTURE_A.tenant); assert.equal(dashboard.transactions.length, 0); assert.equal(dashboard.summary.totalRevenue, 0);
    assert.deepEqual(await state(FIXTURE_B), foreignBefore);
  });
  await materializeExistingLedger('e2e-org-a'); await materializeExistingLedger('e2e-org-b');
  const output = path.join(__dirname, '../test-results/datalake-storage-results.json');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify({ completedAt: new Date().toISOString(), liveProviderCalls: false, storage: 'Real loopback S3-compatible service', database: 'Real isolated PostgreSQL', cache: 'Real isolated Redis', checks: results }, null, 2));
  console.log(`Completed ${results.length} real storage/database checks. No customer/provider API calls were made.`);
}
main().catch((error) => { console.error(`Storage harness failed: ${String(error.message).slice(0, 500)}`); process.exitCode = 1; }).finally(async () => {
  if (syncService?.s3) syncService.s3.destroy();
  if (s3) s3.destroy();
  if (cache) await cache.onModuleDestroy();
  if (database?.isInitialized) await database.destroy();
});
