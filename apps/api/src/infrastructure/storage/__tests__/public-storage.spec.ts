import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { pbkdf2Sync } from 'crypto';
import { FileStorageService } from '../file-storage.service';
import { DocumentShareService } from '../document-share.service';
import { SharedDocumentEntity } from '@infrastructure/persistence/postgres/entities/shared-document.entity';

describe('Private storage and public download URLs', () => {
  const config = new ConfigService({
    S3_ENDPOINT: 'http://minio:9000', S3_PUBLIC_ENDPOINT: 'https://storage.example.test/',
    S3_REGION: 'us-east-1', AWS_ACCESS_KEY_ID: 'test-access', AWS_SECRET_ACCESS_KEY: 'test-secret',
    APP_BASE_URL: 'https://ledger.example.test',
  });
  const token = 'a'.repeat(64);
  const password = 'test-document-password';
  const salt = 'test-salt';
  const initialShare = {
    id: '00000000-0000-4000-8000-000000000001', shareToken: token, isActive: true,
    expiresAt: new Date(Date.now() + 86400000), downloadCount: 0, maxDownloads: 1,
    passwordHash: `${salt}:${pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex')}`,
    s3Key: 'shares/our-company/report.pdf', originalFilename: 'report.pdf', mimeType: 'application/pdf', fileSize: 1024,
  };
  const query = { update: jest.fn(), set: jest.fn(), where: jest.fn(), andWhere: jest.fn(), execute: jest.fn() };
  const repo = { findOne: jest.fn(), createQueryBuilder: jest.fn(() => query), save: jest.fn(), create: jest.fn() };
  const documents = new DocumentShareService(config, repo as unknown as Repository<SharedDocumentEntity>);

  beforeEach(() => {
    repo.findOne.mockReset().mockResolvedValue({ ...initialShare });
    for (const key of ['update', 'set', 'where', 'andWhere'] as const) query[key].mockReset().mockReturnValue(query);
    query.execute.mockReset().mockResolvedValue({ affected: 1 });
    repo.save.mockClear();
  });

  it('generates real S3 signatures for the external HTTPS hostname', async () => {
    const uploads = new FileStorageService(config);
    expect(uploads.getPublicUrl('logos/our-company/logo.png')).toBe('https://storage.example.test/plainledger-uploads/logos/our-company/logo.png');
    const signed = new URL(await uploads.getSignedUrl('private/report.pdf', 60));
    expect(signed.origin).toBe('https://storage.example.test');
    expect(signed.pathname).toBe('/plainledger-uploads/private/report.pdf');
    expect(signed.searchParams.get('X-Amz-Algorithm')).toBe('AWS4-HMAC-SHA256');
    expect(signed.searchParams.get('X-Amz-Expires')).toBe('60');
  });

  it('preserves the internal endpoint when no public endpoint is configured', async () => {
    const uploads = new FileStorageService(new ConfigService({ S3_ENDPOINT: 'http://localhost:9000', S3_REGION: 'us-east-1' }));
    const signed = new URL(await uploads.getSignedUrl('report.pdf'));
    expect(signed.origin).toBe('http://localhost:9000');
  });

  it('creates a signed document URL only after password verification and quota reservation', async () => {
    const result = await documents.accessShare({ shareToken: token, password });
    expect(new URL(result.downloadUrl).origin).toBe('https://storage.example.test');
    expect(result.expiresInSeconds).toBe(300);
    expect(query.execute).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['missing', null, 404],
    ['revoked', { ...initialShare, isActive: false }, 410],
    ['expired', { ...initialShare, expiresAt: new Date(0) }, 410],
    ['limit reached', { ...initialShare, downloadCount: 1 }, 410],
  ])('rejects a %s share', async (_state, share, status) => {
    repo.findOne.mockResolvedValue(share);
    await expect(documents.accessShare({ shareToken: token, password })).rejects.toMatchObject({ status });
    expect(query.execute).not.toHaveBeenCalled();
  });

  it('rejects the wrong password before reserving a download', async () => {
    await expect(documents.accessShare({ shareToken: token, password: 'wrong-password' })).rejects.toMatchObject({ status: 401 });
    expect(query.execute).not.toHaveBeenCalled();
  });

  it('does not return a URL when a concurrent access consumes the last download', async () => {
    query.execute.mockResolvedValue({ affected: 0 });
    await expect(documents.accessShare({ shareToken: token, password })).rejects.toMatchObject({ status: 410 });
  });

  it.each([{ expiresInHours: -1 }, { expiresInHours: Infinity }, { maxDownloads: 0 }, { maxDownloads: 1.5 }, { filename: '../report.pdf' }, { file: Buffer.alloc(0) }])('rejects invalid new share parameters before persistence: %j', async (override) => {
    await expect(documents.createShare({ organizationId: 'our-company', createdBy: 'user', file: Buffer.from('test'), filename: 'report.pdf', mimeType: 'application/pdf', password, ...override })).rejects.toMatchObject({ status: 400 });
    expect(repo.save).not.toHaveBeenCalled();
  });
});
