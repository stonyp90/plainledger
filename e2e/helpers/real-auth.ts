import { expect, type Page } from '@playwright/test';

export function credentials() {
  const username = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;
  if (!username || !password) {
    throw new Error('Real authentication tests require E2E_USERNAME and E2E_PASSWORD for a dedicated test account. Mock storage is not authentication evidence.');
  }
  return { username, password };
}

export async function beginSignIn(page: Page) {
  await page.goto('/login');
  await page.getByRole('button', { name: /Continue to sign in|Continuer.*connexion|Continuer pour|Se connecter avec/i }).click();
  await page.waitForURL(/\/protocol\/openid-connect\/auth(?:\?|$)/);
  const authorizationURL = new URL(page.url());
  expect(authorizationURL.searchParams.get('response_type')).toBe('code');
  expect(authorizationURL.searchParams.get('code_challenge_method')).toBe('S256');
  expect(authorizationURL.searchParams.get('code_challenge')).toBeTruthy();
  await expect(page.locator('#username')).toBeVisible();
  await expect(page.locator('#password')).toBeVisible();
}

export async function signIn(page: Page, account = credentials()) {
  const { username, password } = account;
  await beginSignIn(page);
  await page.locator('#username').fill(username);
  await page.locator('#password').fill(password);
  await page.locator('#kc-login').click();
  await page.waitForURL(url => !url.pathname.includes('/realms/') && /^\/(app|onboarding)/.test(url.pathname));
  await expect.poll(() => page.evaluate(() => Boolean((window as unknown as { keycloak?: { authenticated: boolean } }).keycloak?.authenticated))).toBe(true);
}

/** The request uses the real current token, including its current tenant claim. */
export async function sessionRequest<T = Record<string, unknown>>(page: Page, path: string, method = 'GET', body?: unknown): Promise<{ status: number; body: T }> {
  return page.evaluate(async ({ path, method, body }) => {
    const keycloak = (window as unknown as { keycloak: { token: string; tokenParsed?: { organization?: string } } }).keycloak;
    const response = await fetch(path, {
      method,
      headers: { Authorization: `Bearer ${keycloak.token}`, 'Content-Type': 'application/json', 'x-organization-id': keycloak.tokenParsed?.organization || '' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  }, { path, method, body });
}
