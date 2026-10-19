import { ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { createHash } from 'node:crypto';
import { GoldDataReader } from './gold-data-reader';

export type AccountingDatasetKind = 'dim_account' | 'fact_transaction';
export interface AccountingSnapshotObject { key: string; sha256: string; rows: number; bytes: number }
export interface CommittedAccountingSnapshot {
  version: 1; provider: 'quickbooks'; connectionId: string; organizationId: string; tenantId: string; runId: string;
  currency: string; startDate: string; endDate: string; createdAt: string; accountingMethod: 'Accrual';
  datasets: Record<AccountingDatasetKind, AccountingSnapshotObject[]>;
  stats: { accountsSynced: number; transactionsSynced: number; ledgerLinesSynced: number };
}
const UUID = /^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i;
function day(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
function invalid(): never { throw new UnprocessableEntityException('Committed accounting snapshot metadata is invalid; the stored data was not read'); }
export function validateAccountingSnapshot(value: unknown, organizationId: string, tenantId: string, connectionId: string): CommittedAccountingSnapshot {
  if (!value || typeof value !== 'object') invalid();
  const snapshot = value as CommittedAccountingSnapshot;
  if (snapshot.version !== 1 || snapshot.provider !== 'quickbooks' || snapshot.organizationId !== organizationId || snapshot.tenantId !== tenantId || snapshot.connectionId !== connectionId ||
    !UUID.test(organizationId) || !UUID.test(connectionId) || !UUID.test(snapshot.runId) || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(tenantId) ||
    snapshot.accountingMethod !== 'Accrual' || !/^[A-Z]{3}$/.test(snapshot.currency) ||
    !day(snapshot.startDate) || !day(snapshot.endDate) || snapshot.startDate > snapshot.endDate ||
    typeof snapshot.createdAt !== 'string' || !Number.isFinite(Date.parse(snapshot.createdAt)) || !snapshot.datasets || !snapshot.stats) invalid();
  const prefix = `snapshots/${tenantId}/${connectionId}/${snapshot.runId}/`;
  let totalRows = 0, totalBytes = 0;
  const keys = new Set<string>();
  for (const kind of ['dim_account', 'fact_transaction'] as const) {
    const objects = snapshot.datasets[kind];
    if (!Array.isArray(objects) || !objects.length || objects.length > 200) invalid();
    let rows = 0;
    for (const object of objects) {
      if (!object || typeof object.key !== 'string' || !object.key.startsWith(`${prefix}${kind}-`) ||
        !new RegExp(`^${kind}-[0-9]{5}\\.json$`).test(object.key.slice(prefix.length)) || keys.has(object.key) ||
        !/^[a-f\d]{64}$/.test(object.sha256) || !Number.isSafeInteger(object.rows) || object.rows < 0 ||
        !Number.isSafeInteger(object.bytes) || object.bytes < 2 || object.bytes > 8 * 1024 * 1024) invalid();
      keys.add(object.key); rows += object.rows; totalBytes += object.bytes;
    }
    totalRows += rows;
    const expectedRows = kind === 'dim_account' ? snapshot.stats.accountsSynced : snapshot.stats.ledgerLinesSynced;
    if (!Number.isSafeInteger(expectedRows) || expectedRows < 0 || rows !== expectedRows) invalid();
  }
  if (totalRows > 520_000 || totalBytes > 100 * 1024 * 1024 || !Number.isSafeInteger(snapshot.stats.transactionsSynced) || snapshot.stats.transactionsSynced < 0 ||
    snapshot.stats.transactionsSynced > snapshot.stats.ledgerLinesSynced) invalid();
  return snapshot;
}

/** The database commit is the only publication boundary. Disconnected sources retain
 * their last validated snapshot, but no second source may silently replace it. */
export async function getCommittedAccountingSnapshot(database: Pick<DataSource, 'query'>, tenantId: string): Promise<CommittedAccountingSnapshot | null> {
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(tenantId)) invalid();
  const rows = await database.query<Array<{ id: string; organization_id: string; snapshot: unknown }>>(`
    SELECT c.id, c.organization_id, c.metadata->'accountingSnapshot' AS snapshot
    FROM accounting.data_source_connections c
    JOIN accounting.organizations o ON o.id = c.organization_id
    WHERE o.tenant_id = $1 AND o.deleted_at IS NULL AND c.metadata ? 'accountingSnapshot'
    ORDER BY c.id LIMIT 2
  `, [tenantId]);
  if (!rows.length) return null;
  if (rows.length !== 1) invalid();
  return validateAccountingSnapshot(rows[0].snapshot, rows[0].organization_id, tenantId, rows[0].id);
}

export async function readCommittedAccountingDataset<T extends { organization_key?: string }>(reader: GoldDataReader, snapshot: CommittedAccountingSnapshot, kind: AccountingDatasetKind): Promise<T[]> {
  validateAccountingSnapshot(snapshot, snapshot.organizationId, snapshot.tenantId, snapshot.connectionId);
  const output: T[] = [];
  for (const object of snapshot.datasets[kind]) {
    const rows = await reader.readTenantFile<T>(object.key, snapshot.tenantId);
    if (rows === null) throw new ServiceUnavailableException('A committed accounting snapshot object is missing; the data source requires repair');
    const json = JSON.stringify(rows);
    if (rows.length !== object.rows || Buffer.byteLength(json) !== object.bytes || createHash('sha256').update(json).digest('hex') !== object.sha256) {
      throw new UnprocessableEntityException('A committed accounting snapshot object failed its integrity check');
    }
    for (const row of rows) output.push(row);
  }
  return output;
}
