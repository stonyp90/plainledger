import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import test from 'node:test';
import { pages, renderPublicPage } from '../scripts/export-public-pages.mjs';

const read = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const routes = ['/', '/newsletter', '/terms', '/privacy', '/security', '/quebec', '/canada', '/tools/sred-calculator', '/quebec/montreal'];

test('sitemap contains precisely the nine public canonical routes', () => {
  assert.deepEqual(pages.map(page => page.path), routes);
  const sitemap = read('public/sitemap.xml');
  assert.deepEqual([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]), routes.map(path => 'https://plainledger.ca' + path));
  assert.doesNotMatch(sitemap, /hreflang|\?lang|#|<lastmod>|<priority>/);
  const app = read('src/App.tsx');
  for (const route of routes) assert.ok(app.includes(`path="${route}"`), route);
});

test('one crawler policy protects exact private routes and their descendants', () => {
  const robots = read('public/robots.txt');
  assert.equal([...robots.matchAll(/^User-agent:/gm)].length, 1);
  assert.match(robots, /^User-agent: \*$/m);
  for (const path of ['/app', '/admin', '/api', '/graphql', '/shared', '/help/knowledge-base']) {
    assert.ok(robots.includes(`Disallow: ${path}$\n`));
    assert.ok(robots.includes(`Disallow: ${path}?\n`));
    assert.ok(robots.includes(`Disallow: ${path}/\n`));
    assert.ok(read('public/_headers').includes(`${path}\n  X-Robots-Tag: noindex, nofollow`));
  }
  assert.ok(!robots.includes('Disallow: /apple'));
});

test('all public documents have matching visible content and metadata without mock proof', () => {
  for (const page of pages) {
    const html = renderPublicPage(read('index.html'), page);
    assert.ok(html.includes(`href="https://plainledger.ca${page.path}"`));
    assert.ok(html.includes('<main><h1>'));
    assert.ok(html.includes('lang="en-CA"'));
    assert.ok(html.includes('G-85LVG81DY5'));
    assert.ok(html.includes('/brand/splash/entry.js'));
    assert.doesNotMatch(html, /75[ ,]?000|75K|847[ ,]?000|847K|92%|4\.9|aggregateRating|reviewCount|reviewBody|\?lang=fr/);
    const schema = JSON.parse(html.match(/data-plainledger-schema="page">(.*?)<\/script>/s)[1]);
    assert.equal(schema.url, `https://plainledger.ca${page.path}`);
    assert.equal(schema.description, page.description.fr);
  }
  assert.doesNotMatch(read('public/llms.txt'), /75[ ,]?000|75K|847K|92%|4\.9/);
});

test('Google verification bytes are exact', () => {
  const content = read('public/google5781a30bbd14f93a.html');
  assert.equal(content, 'google-site-verification: google5781a30bbd14f93a.html');
  assert.equal(Buffer.byteLength(content), 53);
});

test('built export and service-worker revisions agree', { skip: !existsSync(new URL('../dist/index.html', import.meta.url)) }, () => {
  const worker = read('dist/sw.js');
  for (const page of pages) {
    const file = page.path === '/' ? 'index.html' : `${page.path.slice(1)}.html`;
    const html = read(`dist/${file}`);
    assert.ok(html.includes(`href="https://plainledger.ca${page.path}"`));
    assert.ok(html.includes('<main><h1>'));
    const revision = createHash('md5').update(html).digest('hex');
    assert.ok(worker.includes(`url:"${file}",revision:"${revision}"`), `${file} must be precached using its final bytes`);
  }
});
