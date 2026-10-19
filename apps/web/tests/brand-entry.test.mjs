import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const sha = s => createHash('sha256').update(s).digest('hex');
test('approved scene and wordmark are unchanged', () => {
  const scene = read('public/brand/splash/scene.html');
  const approval = JSON.parse(read('public/brand/splash/approval.json'));
  assert.equal(sha(scene), approval.scene_sha256);
  const scripts = [...scene.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
  assert.equal(sha(scripts.at(-1)[1]), approval.renderer_sha256);
  assert.equal(sha(scene.match(/<script type="application\/json" id="assets">([\s\S]*?)<\/script>/)[1]), approval.assets_sha256);
  assert.equal(approval.website_playback_seconds, 3);
});
test('entry is mounted before the application bundle', () => {
  const html = read('index.html');
  const mount = html.indexOf('src="/brand/splash/entry.js"');
  assert.ok(mount > html.indexOf('id="root"'));
  assert.ok(mount < html.indexOf('src="/src/main.tsx"'));
});
test('entry has accessibility and fail-open controls', () => {
  const entry = read('public/brand/splash/entry.js');
  for (const required of ['prefers-reduced-motion', 'LOAD_TIMEOUT_MS = 6000', "finish('skipped')", 'root.inert = previousInert', 'visibilitychange', 'plainledger-language']) assert.ok(entry.includes(required), required);
  assert.ok(!entry.includes('sessionStorage'), 'replay on every full home-page visit');
});
