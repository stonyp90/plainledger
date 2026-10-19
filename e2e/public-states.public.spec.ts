import { test, expect } from '@playwright/test';
import pages from '../fixtures/ui/public-pages.json';

for (const language of ['en', 'fr']) {
  for (const width of [360, 768, 1440]) {
    test(`${language} public pages render without overflow or broken SVG at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 960 });
      await page.addInitScript(lang => localStorage.setItem('plainledger-language', lang), language);
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      for (const fixture of pages) {
        await page.goto(fixture.path);
        await expect(page.locator('h1').first()).toBeVisible();
        await expect(page.locator('h1').first()).toContainText(new RegExp(fixture.heading, 'i'));
        const geometry = await page.evaluate(() => ({
          viewport: document.documentElement.clientWidth,
          content: document.documentElement.scrollWidth,
          invalidSvg: Array.from(document.querySelectorAll('svg *')).flatMap(element =>
            Array.from(element.attributes).filter(attribute => ['d', 'x', 'y', 'width', 'height', 'cx', 'cy', 'r', 'points', 'transform'].includes(attribute.name) && /NaN|Infinity/.test(attribute.value)).map(attribute => `${element.tagName}.${attribute.name}`)),
        }));
        expect(geometry.invalidSvg, fixture.path).toEqual([]);
        expect(geometry.content, `${fixture.path} horizontal overflow`).toBeLessThanOrEqual(geometry.viewport + 1);
      }
      expect(errors).toEqual([]);
    });
  }
}

test('a protected route sends an anonymous visitor to sign in', async ({ page }) => {
  await page.goto('/app/reports');
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Continue to sign in|Continuer la connexion/i })).toBeVisible();
});

test('empty and malformed contact fields cannot submit', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('plainledger-language', 'en'));
  const submissions: string[] = [];
  page.on('request', request => { if (request.method() === 'POST' && /contact/.test(request.url())) submissions.push(request.url()); });
  await page.goto('/');
  const form = page.locator('form').filter({ has: page.getByRole('button', { name: 'Send Message' }) });
  await expect(form).toBeVisible();
  await form.getByRole('button', { name: 'Send Message' }).click();
  expect(await form.evaluate(element => (element as HTMLFormElement).checkValidity())).toBe(false);
  await form.locator('input[type="email"]').fill('not-an-email');
  expect(await form.locator('input[type="email"]').evaluate(element => (element as HTMLInputElement).validity.typeMismatch)).toBe(true);
  expect(submissions).toEqual([]);
});
