'use strict';

const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const { once } = require('node:events');
const { createServer } = require('node:http');
const path = require('node:path');
const test = require('node:test');
const { promisify } = require('node:util');

const run = promisify(execFile);
const helper = path.join(__dirname, 'wait-for-http.cjs');
const ready = JSON.stringify({ status: 'ready', checks: { database: 'connected', cache: 'connected' } });

async function withProbeServer(pathname, respond, verify) {
  let requests = 0;
  const server = createServer((request, response) => {
    assert.equal(request.url, pathname);
    respond(response, ++requests);
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const target = `http://127.0.0.1:${server.address().port}${pathname}`;
    const result = await run(process.execPath, [helper, target], { timeout: 6000 });
    assert.match(result.stdout, /Ready:/);
    verify(requests);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test('accepts MinIO readiness as an empty HTTP 200 without parsing JSON', async () => {
  await withProbeServer('/minio/health/ready', (response) => response.end(), (requests) => {
    assert.equal(requests, 1);
  });
});

test('retries an HTML SPA fallback until the API reports connected dependencies', async () => {
  await withProbeServer('/health/ready', (response, requests) => {
    response.setHeader('Content-Type', requests === 1 ? 'text/html' : 'application/json');
    response.end(requests === 1 ? '<!doctype html><div id="root"></div>' : ready);
  }, (requests) => assert.equal(requests, 2));
});

test('retries API readiness when a dependency is disconnected, including with a query string', async () => {
  await withProbeServer('/api/health/ready?probe=ci', (response, requests) => {
    response.setHeader('Content-Type', 'application/json');
    response.end(requests === 1
      ? JSON.stringify({ status: 'ready', checks: { database: 'connected', cache: 'disconnected' } })
      : ready);
  }, (requests) => assert.equal(requests, 2));
});

test('does not mistake HTTP 204 for a successful readiness response', async () => {
  await withProbeServer('/minio/health/ready', (response, requests) => {
    response.statusCode = requests === 1 ? 204 : 200;
    response.end();
  }, (requests) => assert.equal(requests, 2));
});

test('rejects non-loopback targets before making a request', async () => {
  await assert.rejects(() => run(process.execPath, [helper, 'https://plainledger.e2e.invalid/health/ready']), (error) => {
    assert.match(error.stderr, /loopback HTTP targets only/);
    return true;
  });
});
