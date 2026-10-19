import { DataSource } from 'typeorm';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { GoldDataReader } from '../gold-data-reader';
import { CommittedAccountingSnapshot, getCommittedAccountingSnapshot, readCommittedAccountingDataset, validateAccountingSnapshot } from '../committed-accounting-snapshot';

const ORG = '11111111-1111-4111-8111-111111111111', CONNECTION = '22222222-2222-4222-8222-222222222222', RUN = '33333333-3333-4333-8333-333333333333', TENANT = 'snapshot-tenant';
function fixture() {
  const account = [{ organization_key: TENANT, account_key: 'account' }];
  const transactions = [
    [{ organization_key: TENANT, transaction_key: 'posting-1' }],
    [{ organization_key: TENANT, transaction_key: 'posting-2' }],
  ];
  const objects = new Map<string, string>();
  const object = (kind: string, index: number, rows: unknown[]) => {
    const json = JSON.stringify(rows), key = `snapshots/${TENANT}/${CONNECTION}/${RUN}/${kind}-${String(index).padStart(5, '0')}.json`;
    objects.set(key, json);
    return { key, sha256: createHash('sha256').update(json).digest('hex'), bytes: Buffer.byteLength(json), rows: rows.length };
  };
  const snapshot: CommittedAccountingSnapshot = {
    version: 1, provider: 'quickbooks', connectionId: CONNECTION, organizationId: ORG, tenantId: TENANT, runId: RUN, currency: 'CAD', startDate: '1900-01-01', endDate: '2026-10-19', createdAt: '2026-10-19T10:00:00Z', accountingMethod: 'Accrual',
    datasets: { dim_account: [object('dim_account', 0, account)], fact_transaction: transactions.map((rows, index) => object('fact_transaction', index, rows)) },
    stats: { accountsSynced: 1, transactionsSynced: 1, ledgerLinesSynced: 2 },
  };
  const send = jest.fn(async (command: GetObjectCommand) => {
    const json = objects.get(command.input.Key!);
    if (json === undefined) throw Object.assign(new Error('fixture missing'), { name: 'NoSuchKey', $metadata: { httpStatusCode: 404 } });
    return { Body: Readable.from([Buffer.from(json)]), ContentLength: Buffer.byteLength(json) };
  });
  return { snapshot, objects, send, reader: new GoldDataReader({ send } as unknown as S3Client, 'fixture-gold') };
}
describe('committed accounting snapshot selector', () => {
  it('selects the current exact-tenant manifest from the database', async () => {
    const { snapshot } = fixture();
    const query = jest.fn(async () => [{ id: CONNECTION, organization_id: ORG, snapshot }]);
    expect(await getCommittedAccountingSnapshot({ query } as unknown as DataSource, TENANT)).toEqual(snapshot);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('o.tenant_id = $1 AND o.deleted_at IS NULL'), [TENANT]);
  });
  it('allows legacy reads only if the tenant has no committed snapshot', async () => {
    const query = jest.fn(async () => []);
    expect(await getCommittedAccountingSnapshot({ query } as unknown as DataSource, TENANT)).toBeNull();
  });
  it('does not hide a database outage as an empty dataset', async () => {
    const query = jest.fn(async () => { throw new Error('fixture unavailable'); });
    await expect(getCommittedAccountingSnapshot({ query } as unknown as DataSource, TENANT)).rejects.toThrow('unavailable');
  });
  it('rejects ambiguous committed sources', async () => {
    const { snapshot } = fixture(); const row = { id: CONNECTION, organization_id: ORG, snapshot };
    const query = jest.fn(async () => [row, row]);
    await expect(getCommittedAccountingSnapshot({ query } as unknown as DataSource, TENANT)).rejects.toThrow('metadata is invalid');
  });
  it('reads all selected immutable parts and ignores arbitrary uncommitted objects', async () => {
    const { snapshot, objects, reader, send } = fixture();
    objects.set(`snapshots/${TENANT}/${CONNECTION}/uncommitted/fact_transaction-00000.json`, '[{"organization_key":"foreign"}]');
    const rows = await readCommittedAccountingDataset(reader, snapshot, 'fact_transaction');
    expect(rows).toHaveLength(2); expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls.map(([command]) => command.input.Key)).toEqual(snapshot.datasets.fact_transaction.map((object) => object.key));
  });
  it('fails explicitly when a committed object disappeared', async () => {
    const { snapshot, objects, reader } = fixture(); objects.delete(snapshot.datasets.fact_transaction[0].key);
    await expect(readCommittedAccountingDataset(reader, snapshot, 'fact_transaction')).rejects.toThrow('object is missing');
  });
  it('checks hashes even when length, number of rows and tenant match', async () => {
    const { snapshot, objects, reader } = fixture(); const key = snapshot.datasets.fact_transaction[0].key;
    objects.set(key, objects.get(key)!.replace('posting-1', 'changed-1'));
    await expect(readCommittedAccountingDataset(reader, snapshot, 'fact_transaction')).rejects.toThrow('integrity check');
  });
  it('checks each row tenant before allowing hash-valid foreign data', async () => {
    const { snapshot, objects, reader } = fixture(); const object = snapshot.datasets.fact_transaction[0];
    const json = '[{"organization_key":"foreign","transaction_key":"posting-1"}]';
    object.bytes = Buffer.byteLength(json); object.sha256 = createHash('sha256').update(json).digest('hex'); objects.set(object.key, json);
    await expect(readCommittedAccountingDataset(reader, snapshot, 'fact_transaction')).rejects.toThrow('organization');
  });
  it.each([
    ['tenant', (value: CommittedAccountingSnapshot) => { value.tenantId = 'foreign'; }],
    ['organization', (value: CommittedAccountingSnapshot) => { value.organizationId = RUN; }],
    ['connection', (value: CommittedAccountingSnapshot) => { value.connectionId = RUN; }],
    ['foreign path', (value: CommittedAccountingSnapshot) => { value.datasets.dim_account[0].key = value.datasets.dim_account[0].key.replace(TENANT, 'foreign'); }],
    ['path traversal', (value: CommittedAccountingSnapshot) => { value.datasets.dim_account[0].key += '/../other.json'; }],
    ['invalid run', (value: CommittedAccountingSnapshot) => { value.runId = '../elsewhere'; }],
    ['wrong dataset', (value: CommittedAccountingSnapshot) => { value.datasets.dim_account[0].key = value.datasets.fact_transaction[0].key; }],
    ['empty object list', (value: CommittedAccountingSnapshot) => { value.datasets.dim_account = []; }],
    ['malformed hash', (value: CommittedAccountingSnapshot) => { value.datasets.dim_account[0].sha256 = 'bad'; }],
    ['row count mismatch', (value: CommittedAccountingSnapshot) => { value.datasets.dim_account[0].rows = 2; }],
    ['object limit', (value: CommittedAccountingSnapshot) => { value.datasets.dim_account[0].bytes = 9 * 1024 * 1024; }],
    ['invalid dates', (value: CommittedAccountingSnapshot) => { value.endDate = '2026-02-30'; }],
    ['invalid accounting method', (value: CommittedAccountingSnapshot) => { value.accountingMethod = 'Cash' as 'Accrual'; }],
  ])('rejects %s metadata before reading objects', async (_, alter) => {
    const { snapshot, reader, send } = fixture();
    (alter as (value: CommittedAccountingSnapshot) => void)(snapshot);
    expect(() => validateAccountingSnapshot(snapshot, ORG, TENANT, CONNECTION)).toThrow('metadata is invalid');
    const query = jest.fn(async () => [{ id: CONNECTION, organization_id: ORG, snapshot }]);
    await expect(getCommittedAccountingSnapshot({ query } as unknown as DataSource, TENANT)).rejects.toThrow();
    expect(send).not.toHaveBeenCalled();
  });
});
