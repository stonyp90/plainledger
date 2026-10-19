#!/usr/bin/env node
'use strict';

// This script can only talk to the fixed disposable container endpoint. All
// credentials and object data come from the committed synthetic test fixture.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const fixture = require('../../fixtures/storage/isolated-packaging.json');
const apiRequire = createRequire(path.resolve(__dirname, '../../apps/api/package.json'));
const sdk = apiRequire('@aws-sdk/client-s3');
const stage = process.argv[2];
const output = process.argv[3];
const checks = [];

function guard() {
  assert.equal(process.env.CI, 'true', 'Storage qualification requires disposable CI');
  assert.equal(process.env.S3_ENDPOINT, fixture.endpoint);
  assert.equal(process.env.S3_BUCKET_GOLD, fixture.buckets.GOLD);
  assert.equal(process.env.AWS_ACCESS_KEY_ID, fixture.appAccessKey);
  assert.equal(process.env.AWS_SECRET_ACCESS_KEY, fixture.appSecretKey);
  assert.ok(['before-restart', 'after-restart'].includes(stage));
  assert.ok(output, 'A qualification evidence path is required');
}
function client(accessKeyId, secretAccessKey) {
  return new sdk.S3Client({ endpoint: fixture.endpoint, region: fixture.region, forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey }, requestHandler: { connectionTimeout: 5000, requestTimeout: 15000 } });
}
async function check(name, work) {
  await work();
  checks.push({ name, status: 'passed' });
  console.log(`Container permission check passed: ${name}`);
}
async function denied(request) {
  await assert.rejects(request, error => error?.$metadata?.httpStatusCode === 403,
    'The server must explicitly reject the operation with HTTP 403');
}
async function anonymous(bucket, method = 'GET') {
  const response = await fetch(`${fixture.endpoint}/${bucket}/${fixture.probeKey}`, {
    method, redirect: 'error', signal: AbortSignal.timeout(15000),
    ...(method === 'PUT' ? { body: 'unauthorized replacement' } : {}),
  });
  const body = await response.text();
  return { status: response.status, body };
}
async function main() {
  guard();
  const app = client(fixture.appAccessKey, fixture.appSecretKey);
  const root = client(fixture.rootAccessKey, fixture.rootSecretKey);
  const invalid = client(fixture.appAccessKey, fixture.appSecretKey + '-incorrect');
  const buckets = Object.values(fixture.buckets);
  const privateBuckets = buckets.filter(bucket => bucket !== fixture.buckets.UPLOADS);
  try {
    if (stage === 'before-restart') {
      await check('scoped application credentials read and write every initialized bucket', async () => {
        for (const Bucket of buckets) {
          await app.send(new sdk.HeadBucketCommand({ Bucket }));
          await app.send(new sdk.PutObjectCommand({ Bucket, Key: fixture.probeKey, Body: fixture.probeBody }));
          const response = await app.send(new sdk.GetObjectCommand({ Bucket, Key: fixture.probeKey }));
          assert.equal(await response.Body.transformToString(), fixture.probeBody);
          const listing = await app.send(new sdk.ListObjectsV2Command({ Bucket, Prefix: fixture.probeKey }));
          assert.equal(listing.Contents?.length, 1);
        }
      });
      await check('scoped multipart uploads can upload, list parts and abort', async () => {
        const Bucket = fixture.buckets.DOCUMENT_SHARE, Key = 'container-qualification/multipart.txt';
        const upload = await app.send(new sdk.CreateMultipartUploadCommand({ Bucket, Key }));
        try {
          await app.send(new sdk.UploadPartCommand({ Bucket, Key, UploadId: upload.UploadId, PartNumber: 1, Body: fixture.probeBody }));
          const parts = await app.send(new sdk.ListPartsCommand({ Bucket, Key, UploadId: upload.UploadId }));
          assert.equal(parts.Parts?.length, 1);
        } finally {
          await app.send(new sdk.AbortMultipartUploadCommand({ Bucket, Key, UploadId: upload.UploadId }));
        }
      });
      await root.send(new sdk.CreateBucketCommand({ Bucket: fixture.outsideBucket }));
      await root.send(new sdk.PutObjectCommand({ Bucket: fixture.outsideBucket, Key: fixture.probeKey, Body: fixture.probeBody }));
      await check('bucket enumeration is scoped and application credentials cannot administer policies', async () => {
        // MinIO filters ListBuckets to buckets authorized by ListBucket or
        // GetBucketLocation when ListAllMyBuckets is absent. Verify that scope.
        const listing = await app.send(new sdk.ListBucketsCommand({}));
        assert.deepEqual((listing.Buckets ?? []).map(bucket => bucket.Name).sort(), [...buckets].sort());
        await denied(app.send(new sdk.CreateBucketCommand({ Bucket: 'plainledger-e2e-unauthorized-create' })));
        await denied(app.send(new sdk.DeleteBucketCommand({ Bucket: fixture.buckets.GOLD })));
        await denied(app.send(new sdk.GetBucketPolicyCommand({ Bucket: fixture.buckets.GOLD })));
        await denied(app.send(new sdk.PutBucketPolicyCommand({ Bucket: fixture.buckets.GOLD, Policy: JSON.stringify({
          Version: '2012-10-17', Statement: [{ Effect: 'Allow', Principal: '*', Action: ['s3:GetObject'], Resource: [`arn:aws:s3:::${fixture.buckets.GOLD}/*`] }],
        }) })));
      });
      await check('application credentials cannot read, list or write a bucket outside their policy', async () => {
        await denied(app.send(new sdk.GetObjectCommand({ Bucket: fixture.outsideBucket, Key: fixture.probeKey })));
        await denied(app.send(new sdk.ListObjectsV2Command({ Bucket: fixture.outsideBucket })));
        await denied(app.send(new sdk.PutObjectCommand({ Bucket: fixture.outsideBucket, Key: 'unauthorized.txt', Body: fixture.probeBody })));
      });
      await check('financial and shared document objects reject anonymous reads', async () => {
        for (const bucket of privateBuckets) assert.equal((await anonymous(bucket)).status, 403, bucket);
      });
      await check('only public asset objects allow anonymous reads and anonymous writes remain denied', async () => {
        assert.deepEqual(await anonymous(fixture.buckets.UPLOADS), { status: 200, body: fixture.probeBody });
        assert.equal((await anonymous(fixture.buckets.UPLOADS, 'PUT')).status, 403);
      });
      await check('incorrect application credentials are rejected', async () => {
        await denied(invalid.send(new sdk.HeadBucketCommand({ Bucket: fixture.buckets.GOLD })));
      });
    } else {
      await check('objects and application permissions survive a container restart', async () => {
        for (const Bucket of buckets) {
          const response = await app.send(new sdk.GetObjectCommand({ Bucket, Key: fixture.probeKey }));
          assert.equal(await response.Body.transformToString(), fixture.probeBody);
        }
        await denied(app.send(new sdk.GetObjectCommand({ Bucket: fixture.outsideBucket, Key: fixture.probeKey })));
      });
      await check('private and public access policies survive a container restart', async () => {
        for (const bucket of privateBuckets) assert.equal((await anonymous(bucket)).status, 403, bucket);
        assert.deepEqual(await anonymous(fixture.buckets.UPLOADS), { status: 200, body: fixture.probeBody });
      });
      // Leave the initialized gold bucket empty for the full accounting harness.
      for (const Bucket of buckets) {
        await app.send(new sdk.DeleteObjectCommand({ Bucket, Key: fixture.probeKey }));
        const listing = await app.send(new sdk.ListObjectsV2Command({ Bucket }));
        assert.equal(listing.Contents?.length ?? 0, 0);
      }
      await root.send(new sdk.DeleteObjectCommand({ Bucket: fixture.outsideBucket, Key: fixture.probeKey }));
      await root.send(new sdk.DeleteBucketCommand({ Bucket: fixture.outsideBucket }));
    }
    fs.writeFileSync(output, JSON.stringify({ stage, checks }, null, 2) + '\n');
  } finally {
    app.destroy(); root.destroy(); invalid.destroy();
  }
}
main().catch(error => { console.error(`Container permission qualification failed: ${error.message}`); process.exitCode = 1; });
