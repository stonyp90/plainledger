import { test, expect } from '@playwright/test';
import { beginSignIn, signIn } from './helpers/real-auth';

test('unauthenticated REST requests cannot access organization data', async ({ request }) => {
  const response = await request.get('/api/organizations/e2e-org-a');
  expect(response.status()).toBe(401);
});

test('forged unsigned tokens cannot access protected data', async ({ request }) => {
  const payload = Buffer.from(JSON.stringify({ sub: 'forged', organization: 'e2e-org-a', realm_access: { roles: ['owner'] }, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
  const response = await request.get('/api/organizations/e2e-org-a', { headers: { Authorization: `Bearer eyJhbGciOiJub25lIn0.${payload}.forged` } });
  expect(response.status()).toBe(401);
});

test('incorrect credentials remain on Keycloak and show an error', async ({ page }) => {
  await beginSignIn(page);
  await page.locator('#username').fill('invalid-user@example.invalid');
  await page.locator('#password').fill('not-a-valid-password');
  await page.locator('#kc-login').click();
  await expect(page.locator('#input-error, .alert-error, [role="alert"]').first()).toBeVisible();
  expect(new URL(page.url()).pathname).toContain('/realms/');
});

test('real login, refresh, reload, tenant denial, and logout', async ({ page }) => {
  await signIn(page);
  const refreshed = await page.evaluate(async () => {
    const keycloak = (window as unknown as { keycloak: { updateToken: (minValidity: number) => Promise<boolean>; authenticated: boolean; tokenParsed?: { organization?: string; aud?: string | string[] } } }).keycloak;
    await keycloak.updateToken(-1);
    return { authenticated: keycloak.authenticated, organization: keycloak.tokenParsed?.organization, audience: keycloak.tokenParsed?.aud };
  });
  expect(refreshed.authenticated).toBe(true);
  expect(refreshed.organization).toBeTruthy();
  expect([refreshed.audience].flat()).toContain('plainledger-api');
  const forbiddenStatus = await page.evaluate(async () => {
    const token = (window as unknown as { keycloak: { token: string } }).keycloak.token;
    const response = await fetch('/api/organizations/e2e-other-tenant', { headers: { Authorization: `Bearer ${token}` } });
    return response.status;
  });
  expect(forbiddenStatus).toBe(403);
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean((window as unknown as { keycloak?: { authenticated: boolean } }).keycloak?.authenticated))).toBe(true);
  await page.evaluate(() => {
    const keycloak = (window as unknown as { keycloak: { logout: (options: { redirectUri: string }) => Promise<void> } }).keycloak;
    void keycloak.logout({ redirectUri: `${window.location.origin}/login` });
  });
  await page.waitForURL(/\/login(?:\?|$)/);
  await expect.poll(() => page.evaluate(() => Boolean((window as unknown as { keycloak?: { authenticated: boolean } }).keycloak?.authenticated))).toBe(false);
});
