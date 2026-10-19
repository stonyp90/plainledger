/* Run after npm run build. Set PLAYWRIGHT_MODULE to an installed Playwright package.
 * SITE_URL optionally checks the real deployment rather than the local dist directory.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '../dist');
const results = [];
const evidence = process.env.EVIDENCE_DIR || '/tmp/plainledger-splash-checks';
fs.mkdirSync(evidence, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  let file = path.resolve(root, '.' + rel);
  if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403); res.end(); return; }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, 'index.html');
  res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
  res.end(fs.readFileSync(file));
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = process.env.SITE_URL || `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const report = (test, extra = {}) => { const r = { test, passed: true, ...extra }; results.push(r); console.log(JSON.stringify(r)); };
  try {
    for (const [width, height] of [[1440, 900], [390, 844], [320, 568], [768, 1024]]) {
      const ctx = await browser.newContext({ viewport: { width, height }, locale: 'en-CA', serviceWorkers: 'block' });
      const page = await ctx.newPage(); const errors = []; page.on('pageerror', error => errors.push(error.message));
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => document.documentElement.dataset.plSplash === 'playing');
      assert.equal(await page.locator('#root').evaluate(n => n.inert), true);
      await page.waitForTimeout(1100);
      await page.screenshot({ path: path.join(evidence, `splash-${width}.png`) });
      await page.waitForFunction(() => document.documentElement.dataset.plSplashReason === 'ended', { timeout: 8000 });
      await page.waitForTimeout(380);
      assert.equal(await page.locator('#pl-brand-entry').count(), 0);
      assert.equal(await page.locator('#root').evaluate(n => n.inert), false);
      await page.waitForFunction(() => document.getElementById('root').textContent.length > 100);
      assert.deepEqual(errors, []);
      report('automatic playback and visible website handoff', { width, height });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => document.documentElement.dataset.plSplash === 'playing');
      await page.locator('#pl-brand-entry button').first().click();
      const frame = await (await page.locator('#pl-brand-entry iframe').elementHandle()).contentFrame();
      const before = await frame.evaluate(() => document.querySelector('canvas').toDataURL());
      await page.waitForTimeout(450);
      assert.equal(await frame.evaluate(() => document.querySelector('canvas').toDataURL()), before);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(380);
      assert.equal(await page.locator('#pl-brand-entry').count(), 0);
      report('full reload replays, pause freezes, Escape skips', { width, height });
      await ctx.close();
    }
    let ctx = await browser.newContext({ locale: 'fr-CA', reducedMotion: 'reduce', serviceWorkers: 'block' });
    let page = await ctx.newPage(); await page.goto(url, { waitUntil: 'domcontentloaded' });
    assert.equal(await page.locator('#pl-brand-entry').count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.dataset.plSplash), 'reduced-motion');
    report('reduced-motion bypass'); await ctx.close();
    ctx = await browser.newContext({ locale: 'fr-CA', serviceWorkers: 'block' });
    page = await ctx.newPage(); await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.documentElement.dataset.plSplash === 'playing');
    assert.equal(await page.locator('#pl-brand-entry button').last().innerText(), 'Passer l’animation');
    await page.locator('#pl-brand-entry button').last().click();
    report('French locale and skip button'); await ctx.close();
    ctx = await browser.newContext({ serviceWorkers: 'block' }); page = await ctx.newPage();
    await page.route('**/brand/splash/scene.html*', route => route.abort());
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.documentElement.dataset.plSplash === 'complete', { timeout: 9000 });
    assert.equal(await page.locator('#root').evaluate(n => n.inert), false);
    report('failed scene does not block website'); await ctx.close();
    fs.writeFileSync(path.join(evidence, 'results.json'), JSON.stringify({ url, checkedAt: new Date().toISOString(), results }, null, 2));
    console.log('ALL ' + results.length + ' BROWSER CHECKS PASSED: ' + url);
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
