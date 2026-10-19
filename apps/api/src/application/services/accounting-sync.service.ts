import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, QueryRunner } from 'typeorm';
import { createHash, randomUUID } from 'node:crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { QuickBooksService } from '@infrastructure/adapters/accounting/quickbooks/quickbooks.service';
import { LEDGER_START_DATE, LedgerReportPart, LedgerScope, QuickBooksReportLimitError, ReconciledLedger, ledgerHash, reconcileQuickBooksLedger } from '@infrastructure/adapters/accounting/quickbooks/quickbooks-ledger';
import { ConnectionTokenCipher } from '@infrastructure/auth/connection-token';
import { DataSourceConnectionEntity } from '@infrastructure/persistence/postgres/entities/data-source-connection.entity';
import { OrganizationEntity } from '@infrastructure/persistence/postgres/entities/organization.entity';
import { GoldDataReader } from '@infrastructure/services/gold-data-reader';
import { AccountingDatasetKind, AccountingSnapshotObject, CommittedAccountingSnapshot, readCommittedAccountingDataset, validateAccountingSnapshot } from '@infrastructure/services/committed-accounting-snapshot';

export interface AccountingSyncResult {
  success: true;
  stats: { accountsSynced: number; transactionsSynced: number; ledgerLinesSynced: number };
  syncedAt: Date;
  runId: string;
  coverage: { startDate: string; endDate: string; accountingMethod: 'Accrual'; currency: string };
  message: string;
}
type GoldRow = Record<string, unknown> & { organization_key: string };
const UUID = /^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i;
const SNAPSHOT_BYTES = 100 * 1024 * 1024;
const OBJECT_BYTES = 8 * 1024 * 1024;
function stableUuid(value: string): string {
  const bytes = createHash('sha256').update(value).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 15) | 128; // UUID v8, deterministic namespace-bound custom hash.
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
function decimal(cents: number): string { return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`; }

/** Imports a complete, reconciled provider ledger. The caller must authorize an
 * active owner/admin first; this service revalidates the exact organization/source.
 * Provider APIs are read-only. No customer messages or source-side writes occur. */
@Injectable()
export class AccountingSyncService {
  private readonly cipher: ConnectionTokenCipher;
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private readonly database: DataSource, private readonly config: ConfigService, private readonly quickbooks: QuickBooksService) {
    this.cipher = new ConnectionTokenCipher(config);
    this.bucket = config.get<string>('S3_BUCKET_GOLD') || 'plainledger-gold';
    const endpoint = config.get<string>('S3_ENDPOINT');
    const accessKeyId = config.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = config.get<string>('AWS_SECRET_ACCESS_KEY');
    this.s3 = new S3Client({
      endpoint, region: config.get<string>('S3_REGION') || config.get<string>('AWS_REGION') || 'us-east-1', forcePathStyle: !!endpoint,
      ...(accessKeyId && secretAccessKey ? { credentials: { accessKeyId, secretAccessKey, ...(config.get<string>('AWS_SESSION_TOKEN') ? { sessionToken: config.get<string>('AWS_SESSION_TOKEN') } : {}) } } : {}),
      maxAttempts: 3,
      requestHandler: { connectionTimeout: 5000, requestTimeout: 30_000 },
    });
  }

  async sync(connectionId: string, organizationId: string, tenantId: string): Promise<AccountingSyncResult> {
    if (!UUID.test(connectionId) || !UUID.test(organizationId) || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(tenantId)) throw new BadRequestException('Invalid accounting sync scope');
    this.cipher.assertConfigured();
    const runner = this.database.createQueryRunner();
    const runId = randomUUID();
    let locked = false, foundConnection = false;
    await runner.connect();
    try {
      const lock: Array<{ locked: boolean }> = await runner.query('SELECT pg_try_advisory_lock(hashtextextended($1, 0)) AS locked', [`accounting-sync:${organizationId}`]);
      if (lock[0]?.locked !== true) throw new ConflictException('An accounting sync is already running for this organization');
      locked = true;
      const organization = await runner.manager.getRepository(OrganizationEntity).findOne({ where: { id: organizationId, tenantId } });
      const connection = await runner.manager.getRepository(DataSourceConnectionEntity).findOne({ where: { id: connectionId, organizationId } });
      if (!organization || organization.deletedAt || !connection) throw new NotFoundException('Accounting connection not found in this organization');
      foundConnection = true;
      this.assertConnection(connection);
      await this.assertExclusiveLedger(runner, organizationId, connectionId);
      const realm = connection.providerCompanyId!;
      const sandbox = connection.metadata!.environment === 'sandbox';
      const credential = () => this.accessToken(runner, connection);
      const token = await credential();
      // Sequential calls bound provider pressure and make each failure explicit.
      const preferences = await this.quickbooks.getAccountingPreferences(token, realm, sandbox);
      const company = await this.quickbooks.getCompanyInfo(token, realm, sandbox);
      if (preferences.homeCurrency !== organization.currency) throw new ConflictException('The organization currency must match the QuickBooks home currency before syncing');
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const fiscalMonth = monthNames.findIndex((month) => month.toLowerCase() === company.fiscalYearStartMonth?.toLowerCase()) + 1;
      if (fiscalMonth === 0 || (fiscalMonth + 10) % 12 + 1 !== organization.fiscalYearEndMonth) throw new ConflictException('The organization fiscal year must match QuickBooks before syncing');
      const endDate = new Date().toISOString().slice(0, 10);
      const year = Number(endDate.slice(0, 4)) - (Number(endDate.slice(5, 7)) < fiscalMonth ? 1 : 0);
      const scope: LedgerScope = {
        startDate: LEDGER_START_DATE, endDate, currency: preferences.homeCurrency, multiCurrency: preferences.multiCurrency,
        fiscalYearStart: `${year}-${String(fiscalMonth).padStart(2, '0')}-01`,
      };
      if (connection.metadata?.accountingSnapshot) {
        const previous = validateAccountingSnapshot(connection.metadata.accountingSnapshot, organizationId, tenantId, connectionId);
        if (previous.endDate > endDate) throw new ConflictException('The sync date precedes the last committed snapshot');
      }
      const accounts = await this.quickbooks.getLedgerAccounts(await credential(), realm, sandbox);
      const parts: LedgerReportPart[] = [];
      let requests = 0;
      let rawBytes = 0;
      const deadline = Date.now() + 5 * 60_000;
      const collect = async (startDate: string, end: string): Promise<void> => {
        if (++requests > 128 || Date.now() > deadline) throw new QuickBooksReportLimitError();
        try {
          const report = await this.quickbooks.getGeneralLedger(await credential(), realm, startDate, end, sandbox);
          // Keep individual raw report parts below both provider cell and memory limits.
          const reportBytes = Buffer.byteLength(JSON.stringify(report));
          if (reportBytes > OBJECT_BYTES || this.reportCells(report) > 350_000 || rawBytes + reportBytes > SNAPSHOT_BYTES) throw new QuickBooksReportLimitError();
          rawBytes += reportBytes;
          parts.push({ report, startDate, endDate: end });
        } catch (error) {
          if (!(error instanceof QuickBooksReportLimitError) || startDate === end) throw error;
          const startMs = Date.parse(startDate), endMs = Date.parse(end);
          const middle = startMs + Math.floor((endMs - startMs) / 86_400_000 / 2) * 86_400_000;
          await collect(startDate, new Date(middle).toISOString().slice(0, 10));
          await collect(new Date(middle + 86_400_000).toISOString().slice(0, 10), end);
        }
      };
      await collect(scope.startDate, scope.endDate);
      const trial = await this.quickbooks.getTrialBalance(await credential(), realm, scope.startDate, scope.endDate, sandbox);
      const ledger = reconcileQuickBooksLedger(accounts, parts, trial, scope);
      // Detect source chart changes while reports were being assembled. There is no
      // provider cross-request transaction; reconciliation is the acceptance gate.
      const accountsAfter = await this.quickbooks.getLedgerAccounts(await credential(), realm, sandbox);
      if (JSON.stringify(accounts) !== JSON.stringify(accountsAfter)) throw new ConflictException('QuickBooks accounts changed during sync; retry after source changes finish');
      const manifest = await this.stageSnapshot(ledger, organizationId, tenantId, connectionId, runId);

      await runner.startTransaction();
      const currentOrg = await runner.manager.getRepository(OrganizationEntity).findOne({ where: { id: organizationId, tenantId }, lock: { mode: 'pessimistic_write' } });
      const current = await runner.manager.getRepository(DataSourceConnectionEntity).findOne({ where: { id: connectionId, organizationId }, lock: { mode: 'pessimistic_write' } });
      if (!currentOrg || currentOrg.deletedAt || currentOrg.currency !== organization.currency || currentOrg.fiscalYearEndMonth !== organization.fiscalYearEndMonth || !current) throw new ConflictException('Organization changed during sync');
      this.assertConnection(current);
      if (current.providerCompanyId !== realm || current.metadata?.environment !== connection.metadata?.environment || current.accessTokenEncrypted !== connection.accessTokenEncrypted) throw new ConflictException('Accounting connection changed during sync; retry');
      await this.assertExclusiveLedger(runner, organizationId, connectionId);
      await this.persistLedger(runner, ledger, organizationId, connectionId);
      const syncedAt = new Date();
      await runner.query(`UPDATE accounting.data_source_connections SET
        metadata = $3::jsonb, last_sync_at = $4, last_sync_status = 'success', last_sync_error = NULL,
        last_sync_records_count = $5, total_syncs = total_syncs + 1, successful_syncs = successful_syncs + 1, updated_at = NOW()
        WHERE id = $1 AND organization_id = $2`, [connectionId, organizationId, JSON.stringify({ ...current.metadata, accountingSnapshot: manifest }), syncedAt, ledger.postingCount]);
      await runner.commitTransaction();
      return {
        success: true, stats: manifest.stats, syncedAt, runId,
        coverage: { startDate: scope.startDate, endDate: scope.endDate, accountingMethod: 'Accrual', currency: scope.currency },
        message: 'The reconciled accrual ledger and its analytics snapshot were committed. Invoice, bill and contact detail datasets were not imported.',
      };
    } catch (error) {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      if (foundConnection) {
        // Do not overwrite success if a COMMIT response was lost after the server
        // committed it. Immutable staged objects are retained for later inspection.
        await runner.query(`UPDATE accounting.data_source_connections SET last_sync_status = 'failed',
          last_sync_error = 'Sync did not complete validation and publication. Retry or review provider configuration.',
          total_syncs = total_syncs + 1, failed_syncs = failed_syncs + 1, updated_at = NOW()
          WHERE id = $1 AND organization_id = $2 AND (metadata->'accountingSnapshot'->>'runId') IS DISTINCT FROM $3`, [connectionId, organizationId, runId]).catch(() => undefined);
      }
      if (error instanceof BadRequestException || error instanceof ConflictException || error instanceof NotFoundException || error instanceof ServiceUnavailableException || error instanceof UnprocessableEntityException || error instanceof QuickBooksReportLimitError) throw error;
      throw new ServiceUnavailableException('Accounting sync could not complete. Check the connection status before retrying; a partial snapshot was not published');
    } finally {
      if (locked) await runner.query('SELECT pg_advisory_unlock(hashtextextended($1, 0))', [`accounting-sync:${organizationId}`]).catch(() => undefined);
      await runner.release();
    }
  }

  private assertConnection(connection: DataSourceConnectionEntity): void {
    if (connection.provider !== 'quickbooks') throw new BadRequestException('This accounting provider sync is not implemented');
    if (connection.status !== 'active') throw new BadRequestException('Reconnect this data source before syncing');
    if (!/^\d{1,32}$/.test(connection.providerCompanyId || '') || connection.providerCompanyId !== connection.providerAccountId ||
      !['sandbox', 'production'].includes(String(connection.metadata?.environment)) || connection.metadata?.environment !== this.config.get<string>('QUICKBOOKS_ENVIRONMENT')) {
      throw new ConflictException('The connected company or QuickBooks environment does not match current configuration');
    }
  }

  private async assertExclusiveLedger(runner: QueryRunner, organizationId: string, connectionId: string): Promise<void> {
    const conflicts: Array<{ conflict: boolean }> = await runner.query(`SELECT (
      EXISTS(SELECT 1 FROM accounting.data_source_connections WHERE organization_id = $1 AND id <> $2 AND metadata ? 'accountingSnapshot')
      OR EXISTS(SELECT 1 FROM accounting.journal_entries WHERE organization_id = $1 AND source IS DISTINCT FROM $3 AND status = 'POSTED')
    ) AS conflict`, [organizationId, connectionId, `QUICKBOOKS:${connectionId}`]);
    if (conflicts[0]?.conflict !== false) throw new ConflictException('This organization already has a different posted ledger; an explicit source migration is required before syncing');
  }

  private async accessToken(runner: QueryRunner, connection: DataSourceConnectionEntity): Promise<string> {
    const prefix = `${connection.organizationId}:${connection.id}`;
    if (connection.accessTokenEncrypted && connection.tokenExpiresAt && connection.tokenExpiresAt.getTime() > Date.now() + 90_000) {
      return this.cipher.decrypt(connection.accessTokenEncrypted, `${prefix}:access`);
    }
    if (!connection.refreshTokenEncrypted || !connection.refreshTokenExpiresAt || connection.refreshTokenExpiresAt.getTime() <= Date.now()) throw new BadRequestException('The provider authorization expired; reconnect before syncing');
    const refreshToken = this.cipher.decrypt(connection.refreshTokenEncrypted, `${prefix}:refresh`);
    const refreshed = await this.quickbooks.refreshTokens(refreshToken);
    if (!refreshed.accessToken || !refreshed.refreshToken || !Number.isFinite(refreshed.accessTokenExpiresAt?.getTime()) || refreshed.accessTokenExpiresAt.getTime() <= Date.now() + 90_000 ||
      !Number.isFinite(refreshed.refreshTokenExpiresAt?.getTime()) || refreshed.refreshTokenExpiresAt.getTime() <= Date.now()) throw new ServiceUnavailableException('QuickBooks returned invalid refreshed credentials');
    const accessTokenEncrypted = this.cipher.encrypt(refreshed.accessToken, `${prefix}:access`);
    const refreshTokenEncrypted = this.cipher.encrypt(refreshed.refreshToken, `${prefix}:refresh`);
    const result = await runner.manager.getRepository(DataSourceConnectionEntity).createQueryBuilder().update().set({
      accessTokenEncrypted, refreshTokenEncrypted, tokenExpiresAt: refreshed.accessTokenExpiresAt, refreshTokenExpiresAt: refreshed.refreshTokenExpiresAt,
    }).where('id = :id AND organization_id = :organizationId AND status = :status AND refresh_token_encrypted = :previous', {
      id: connection.id, organizationId: connection.organizationId, status: 'active', previous: connection.refreshTokenEncrypted,
    }).execute();
    if (result.affected !== 1) throw new ConflictException('Accounting authorization changed while refreshing; reconnect or retry');
    // Rotated provider tokens must survive any later validation/upload failure.
    Object.assign(connection, { accessTokenEncrypted, refreshTokenEncrypted, tokenExpiresAt: refreshed.accessTokenExpiresAt, refreshTokenExpiresAt: refreshed.refreshTokenExpiresAt });
    return refreshed.accessToken;
  }

  private reportCells(report: unknown): number {
    if (!report || typeof report !== 'object') return 0;
    const raw = report as { Columns?: { Column?: unknown[] }; Rows?: { Row?: unknown[] } };
    const width = raw.Columns?.Column?.length || 1;
    const pending: unknown[] = [...(Array.isArray(raw.Rows?.Row) ? raw.Rows!.Row! : [])];
    let count = 0;
    while (pending.length) {
      const row = pending.pop() as { Rows?: { Row?: unknown[] } } | undefined;
      count += width; if (count > 350_000) break;
      if (Array.isArray(row?.Rows?.Row)) for (const child of row.Rows.Row) pending.push(child);
    }
    return count;
  }

  private goldRows(ledger: ReconciledLedger, organizationId: string, tenantId: string, connectionId: string): Record<AccountingDatasetKind, GoldRow[]> {
    const accountId = (id: string) => stableUuid(`${organizationId}:${connectionId}:account:${id}`);
    const accounts: GoldRow[] = ledger.accounts.map((account) => ({
      organization_key: tenantId, account_key: accountId(account.sourceId), account_id: accountId(account.sourceId), source_account_id: account.sourceId,
      account_code: `QB${ledgerHash(`${connectionId}:${account.sourceId}`).slice(0, 18)}`, source_account_code: account.code, account_name: account.name,
      account_type: account.type, account_subtype: account.subtype, source_account_type: account.sourceType, source_account_subtype: account.sourceSubtype,
      is_active: account.active, is_debit_normal: ['ASSET', 'EXPENSE'].includes(account.type), parent_account_key: account.parentSourceId ? accountId(account.parentSourceId) : null,
      hierarchy_level: account.parentSourceId ? 1 : 0, hierarchy_path: account.name,
      balance_sheet_section: ['ASSET', 'LIABILITY', 'EQUITY'].includes(account.type) ? account.type : null,
      income_statement_section: ['REVENUE', 'EXPENSE'].includes(account.type) ? account.type : null,
    }));
    const transactions: GoldRow[] = [];
    for (const transaction of ledger.transactions) for (const posting of transaction.postings) {
      const amount = (posting.debitCents - posting.creditCents) / 100;
      transactions.push({
        organization_key: tenantId, transaction_key: stableUuid(`${organizationId}:${connectionId}:posting:${posting.key}`),
        transaction_id: stableUuid(`${organizationId}:${connectionId}:transaction:${transaction.key}`), account_key: accountId(posting.sourceAccountId),
        date_key: Number(transaction.date.replace(/-/g, '')), contact_key: null, transaction_type_key: transaction.type,
        transaction_date: transaction.date, posting_date: transaction.date, debit_amount: posting.debitCents / 100, credit_amount: posting.creditCents / 100,
        amount, currency_code: ledger.scope.currency, exchange_rate: 1,
        ...(ledger.scope.currency === 'CAD' ? { amount_cad: amount } : {}), // No invented FX conversion for other home currencies.
        reference_number: transaction.reference, memo: posting.memo, source_system: 'QUICKBOOKS', source_transaction_id: transaction.sourceId,
      });
    }
    return { dim_account: accounts, fact_transaction: transactions };
  }

  private async stageSnapshot(ledger: ReconciledLedger, organizationId: string, tenantId: string, connectionId: string, runId: string): Promise<CommittedAccountingSnapshot> {
    const datasets = this.goldRows(ledger, organizationId, tenantId, connectionId);
    const manifest: CommittedAccountingSnapshot = {
      version: 1, provider: 'quickbooks', connectionId, organizationId, tenantId, runId, currency: ledger.scope.currency,
      startDate: ledger.scope.startDate, endDate: ledger.scope.endDate, createdAt: new Date().toISOString(), accountingMethod: 'Accrual',
      datasets: { dim_account: [], fact_transaction: [] },
      stats: { accountsSynced: ledger.accounts.length, transactionsSynced: ledger.transactions.length, ledgerLinesSynced: ledger.postingCount },
    };
    const objects: Array<{ reference: AccountingSnapshotObject; body: string }> = [];
    let datasetBytes = 0;
    for (const kind of ['dim_account', 'fact_transaction'] as const) {
      let batch: string[] = [], bytes = 2;
      const flush = () => {
        const body = `[${batch.join(',')}]`;
        const reference: AccountingSnapshotObject = {
          key: `snapshots/${tenantId}/${connectionId}/${runId}/${kind}-${String(manifest.datasets[kind].length).padStart(5, '0')}.json`,
          sha256: ledgerHash(body), rows: batch.length, bytes: Buffer.byteLength(body),
        };
        datasetBytes += reference.bytes;
        if (datasetBytes > SNAPSHOT_BYTES) throw new QuickBooksReportLimitError();
        manifest.datasets[kind].push(reference); objects.push({ reference, body }); batch = []; bytes = 2;
      };
      for (const row of datasets[kind]) {
        const json = JSON.stringify(row), rowBytes = Buffer.byteLength(json);
        if (rowBytes + 2 > OBJECT_BYTES) throw new QuickBooksReportLimitError();
        if (bytes + rowBytes + (batch.length ? 1 : 0) > OBJECT_BYTES || batch.length >= 10_000) flush();
        bytes += rowBytes + (batch.length ? 1 : 0); batch.push(json);
      }
      if (batch.length || !manifest.datasets[kind].length) flush();
    }
    validateAccountingSnapshot(manifest, organizationId, tenantId, connectionId);
    for (const object of objects) {
      await this.s3.send(new PutObjectCommand({
        Bucket: this.bucket, Key: object.reference.key, Body: object.body, ContentType: 'application/json',
        ContentMD5: createHash('md5').update(object.body).digest('base64'), IfNoneMatch: '*',
      }));
    }
    const reader = new GoldDataReader(this.s3, this.bucket);
    // Verify private storage reads, every tenant row, byte count and content digest
    // before the database can select these immutable objects.
    await readCommittedAccountingDataset(reader, manifest, 'dim_account');
    await readCommittedAccountingDataset(reader, manifest, 'fact_transaction');
    return manifest;
  }

  private async persistLedger(runner: QueryRunner, ledger: ReconciledLedger, organizationId: string, connectionId: string): Promise<void> {
    const accountId = (id: string) => stableUuid(`${organizationId}:${connectionId}:account:${id}`);
    const accountRows = ledger.accounts.map((account, index) => ({
      id: accountId(account.sourceId), organization_id: organizationId, code: `QB${ledgerHash(`${connectionId}:${account.sourceId}`).slice(0, 18)}`,
      name: account.name, account_type: account.type, account_subtype: account.subtype || null, parent_account_id: account.parentSourceId ? accountId(account.parentSourceId) : null,
      is_active: account.active, display_order: index,
    }));
    // Parents are linked after all imported IDs exist. The batch is wholly inside
    // the same transaction as journals, lines and publication metadata.
    for (let start = 0; start < accountRows.length; start += 1000) await runner.query(`
      INSERT INTO accounting.accounts(id, organization_id, code, name, account_type, account_subtype, is_active, display_order)
      SELECT id, organization_id, code, name, account_type, account_subtype, is_active, display_order
      FROM jsonb_to_recordset($1::jsonb) AS r(id uuid, organization_id uuid, code text, name text, account_type text, account_subtype text, is_active boolean, display_order integer)
      ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name, account_type=EXCLUDED.account_type, account_subtype=EXCLUDED.account_subtype,
        is_active=EXCLUDED.is_active, display_order=EXCLUDED.display_order, updated_at=NOW()
      WHERE accounting.accounts.organization_id=EXCLUDED.organization_id
    `, [JSON.stringify(accountRows.slice(start, start + 1000))]);
    if (accountRows.length) await runner.query(`UPDATE accounting.accounts a SET parent_account_id=r.parent_account_id
      FROM jsonb_to_recordset($1::jsonb) AS r(id uuid, parent_account_id uuid)
      WHERE a.id=r.id AND a.organization_id=$2`, [JSON.stringify(accountRows), organizationId]);
    await runner.query('DELETE FROM accounting.journal_entries WHERE organization_id=$1 AND source=$2', [organizationId, `QUICKBOOKS:${connectionId}`]);
    const entries: Record<string, unknown>[] = [], lines: Record<string, unknown>[] = [];
    for (const transaction of ledger.transactions) {
      const id = stableUuid(`${organizationId}:${connectionId}:transaction:${transaction.key}`);
      entries.push({ id, organization_id: organizationId, entry_number: `QB-${ledgerHash(`${connectionId}:${transaction.key}`).slice(0, 40)}`,
        entry_date: transaction.date, description: `QuickBooks ${transaction.type}`, reference: `${transaction.type}:${transaction.sourceId}`.slice(0, 100), source: `QUICKBOOKS:${connectionId}` });
      transaction.postings.forEach((posting, index) => lines.push({
        id: stableUuid(`${organizationId}:${connectionId}:posting:${posting.key}`), journal_entry_id: id, account_id: accountId(posting.sourceAccountId),
        debit_amount: decimal(posting.debitCents), credit_amount: decimal(posting.creditCents), description: posting.memo, line_order: index,
      }));
    }
    for (let start = 0; start < entries.length; start += 1000) await runner.query(`
      INSERT INTO accounting.journal_entries(id,organization_id,entry_number,entry_date,description,reference,source,status,posted_at)
      SELECT id,organization_id,entry_number,entry_date,description,reference,source,'POSTED',NOW()
      FROM jsonb_to_recordset($1::jsonb) AS r(id uuid,organization_id uuid,entry_number text,entry_date date,description text,reference text,source text)
    `, [JSON.stringify(entries.slice(start, start + 1000))]);
    for (let start = 0; start < lines.length; start += 1000) await runner.query(`
      INSERT INTO accounting.journal_entry_lines(id,journal_entry_id,account_id,debit_amount,credit_amount,description,line_order)
      SELECT id,journal_entry_id,account_id,debit_amount,credit_amount,description,line_order
      FROM jsonb_to_recordset($1::jsonb) AS r(id uuid,journal_entry_id uuid,account_id uuid,debit_amount numeric(15,2),credit_amount numeric(15,2),description text,line_order integer)
    `, [JSON.stringify(lines.slice(start, start + 1000))]);
  }
}
