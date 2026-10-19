import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { beginSignIn, sessionRequest, signIn } from './helpers/real-auth';
import { keycloakAdminToken, openIsolatedDatabase } from './helpers/isolated-stack';
import identity from '../fixtures/auth/isolated-e2e.json';
import securityPages from '../fixtures/ui/account-security.json';

interface InvitationResponse {
  id: string;
  email: string;
  role: string;
  status: string;
  deliveryStatus: string;
  inviteUrl: string;
}

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
  await expect(page.locator(`button[title="${identity.organizationName}"][aria-haspopup="listbox"]:visible`)).toBeVisible();
  const subjects = await page.evaluate(() => {
    const keycloak = (window as unknown as { keycloak: { tokenParsed?: { sub?: string }; idTokenParsed?: { sub?: string } } }).keycloak;
    return { accessSubject: keycloak.tokenParsed?.sub, idSubject: keycloak.idTokenParsed?.sub };
  });
  expect(subjects.accessSubject).toBeTruthy();
  expect(subjects.accessSubject).toBe(subjects.idSubject);
  const refreshed = await page.evaluate(async () => {
    const keycloak = (window as unknown as { keycloak: { updateToken: (minValidity: number) => Promise<boolean>; authenticated: boolean; tokenParsed?: { sub?: string; organization?: string; aud?: string | string[] } } }).keycloak;
    await keycloak.updateToken(-1);
    return { authenticated: keycloak.authenticated, subject: keycloak.tokenParsed?.sub, organization: keycloak.tokenParsed?.organization, audience: keycloak.tokenParsed?.aud };
  });
  expect(refreshed.authenticated).toBe(true);
  expect(refreshed.subject).toBe(subjects.accessSubject);
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
  await expect(page.locator(`button[title="${identity.organizationName}"][aria-haspopup="listbox"]:visible`)).toBeVisible();
  await page.evaluate(() => {
    const keycloak = (window as unknown as { keycloak: { logout: (options: { redirectUri: string }) => Promise<void> } }).keycloak;
    void keycloak.logout({ redirectUri: `${window.location.origin}/login` });
  });
  await page.waitForURL(/\/login(?:\?|$)/);
  await expect.poll(() => page.evaluate(() => Boolean((window as unknown as { keycloak?: { authenticated: boolean } }).keycloak?.authenticated))).toBe(false);
});

test('verified invitee accepts once and current membership governs viewer and admin access', async ({ page, browser, request, baseURL }, testInfo) => {
  test.setTimeout(90_000);
  const database = await openIsolatedDatabase(baseURL);
  const invitedContext = await browser.newContext({ baseURL });
  try {
    const invitee = identity.invitees[testInfo.retry];
    if (!invitee) throw new Error('No unused isolated invitation identity for this attempt');
    const before = await database.query('SELECT id FROM accounting.user_profiles WHERE id=$1', [invitee.userId]);
    expect(before.rowCount).toBe(0);

    await signIn(page);
    const invited = await sessionRequest<InvitationResponse>(page, `/api/organizations/${identity.organization}/invitations`, 'POST', { email: invitee.username, role: 'viewer' });
    expect(invited.status).toBe(201);
    expect(invited.body).toMatchObject({ email: invitee.username, role: 'viewer', status: 'pending', deliveryStatus: 'unsent' });
    const inviteUrl = new URL(invited.body.inviteUrl);
    expect(inviteUrl.origin).toBe('https://plainledger.e2e.invalid');
    expect(inviteUrl.pathname).toBe('/join');
    const token = new URLSearchParams(inviteUrl.hash.slice(1)).get('token');
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);

    const invitedPage = await invitedContext.newPage();
    await signIn(invitedPage, { username: invitee.username, password: identity.password });
    await invitedPage.goto(`${inviteUrl.pathname}${inviteUrl.hash}`);
    const accept = invitedPage.getByRole('button', { name: /Accept invitation|Accepter l’invitation/ });
    await expect(accept).toBeEnabled();
    const acceptance = invitedPage.waitForResponse(response => new URL(response.url()).pathname === '/api/organizations/invitations/accept' && response.request().method() === 'POST');
    await accept.click();
    const accepted = await acceptance;
    expect(accepted.status()).toBe(200);
    expect(await accepted.json()).toMatchObject({ id: identity.organizationId, tenantId: identity.organization, refreshSession: true });
    await expect(invitedPage.getByRole('status').filter({ hasText: /You have joined|Vous avez rejoint/ })).toBeVisible();
    await expect.poll(() => invitedPage.evaluate(() => (window as unknown as { keycloak: { tokenParsed?: { organization?: string } } }).keycloak.tokenParsed?.organization)).toBe(identity.organization);

    // Application-managed tenant fields must persist without becoming editable
    // through the same human's real Keycloak account self-service API.
    const adminHeaders = { Authorization: `Bearer ${await keycloakAdminToken(request, baseURL)}` };
    const readInvitedIdentity = async () => {
      const response = await request.get(`http://localhost:8080/admin/realms/plainledger/users/${invitee.userId}`, { headers: adminHeaders });
      expect(response.status()).toBe(200);
      return response.json() as Promise<{ id: string; email: string; attributes: Record<string, string[]> }>;
    };
    const persistedIdentity = await readInvitedIdentity();
    const tenantAttributes = { organization: [identity.organization], organizationName: [identity.organizationName], demoMode: ['false'] };
    expect(persistedIdentity).toMatchObject({ id: invitee.userId, email: invitee.username, attributes: tenantAttributes });

    const humanHeaders = {
      Authorization: `Bearer ${await invitedPage.evaluate(() => (window as unknown as { keycloak: { token: string } }).keycloak.token)}`,
      Accept: 'application/json',
    };
    const accountUrl = 'http://localhost:8080/realms/plainledger/account/';
    const account = await request.get(accountUrl, { headers: humanHeaders });
    expect(account.status()).toBe(200);
    const ownProfile = await account.json() as {
      id: string; username: string; email: string; firstName: string; lastName: string; attributes?: Record<string, string[]>;
    };
    expect(ownProfile).toMatchObject({ id: invitee.userId, email: invitee.username });
    for (const field of Object.keys(tenantAttributes)) {
      expect(ownProfile.attributes ?? {}).not.toHaveProperty(field);
    }
    const changeTenant = await request.post(accountUrl, {
      headers: humanHeaders,
      data: {
        username: ownProfile.username, email: ownProfile.email, firstName: ownProfile.firstName, lastName: ownProfile.lastName,
        attributes: { ...ownProfile.attributes, organization: [invitee.organization], organizationName: [identity.registration.organizationName], demoMode: ['true'] },
      },
    });
    expect(changeTenant.status()).toBe(400);
    expect(await changeTenant.json()).toMatchObject({
      errors: expect.arrayContaining(Object.keys(tenantAttributes).map(field =>
        expect.objectContaining({ field, errorMessage: 'error-user-attribute-read-only' }))),
    });
    expect((await readInvitedIdentity()).attributes).toEqual(persistedIdentity.attributes);
    expect(await invitedPage.evaluate(async () => {
      const keycloak = (window as unknown as { keycloak: { updateToken: (minValidity: number) => Promise<boolean>; tokenParsed?: { organization?: string } } }).keycloak;
      await keycloak.updateToken(-1);
      return keycloak.tokenParsed?.organization;
    })).toBe(identity.organization);

    const refreshed = await invitedPage.evaluate(() => {
      const claims = (window as unknown as { keycloak: { tokenParsed: { sub: string; jti: string; realm_access?: { roles?: string[] } } } }).keycloak.tokenParsed;
      return { subject: claims.sub, tokenId: claims.jti, roles: claims.realm_access?.roles || [] };
    });
    expect(refreshed.subject).toBe(invitee.userId);
    expect(refreshed.roles).not.toContain('admin');
    expect(refreshed.roles).not.toContain('owner');
    const membership = await database.query('SELECT organization_id,role,email_verified,is_active FROM accounting.user_profiles WHERE id=$1', [invitee.userId]);
    expect(membership.rows).toEqual([{ organization_id: identity.organizationId, role: 'viewer', email_verified: true, is_active: true }]);
    const consumed = await database.query('SELECT status,accepted_by FROM accounting.organization_invitations WHERE id=$1', [invited.body.id]);
    expect(consumed.rows).toEqual([{ status: 'accepted', accepted_by: invitee.userId }]);
    expect((await sessionRequest(invitedPage, '/api/organizations/invitations/accept', 'POST', { token })).status).toBe(410);

    expect((await sessionRequest(invitedPage, '/api/v1/settings/organization')).status).toBe(200);
    expect((await sessionRequest(invitedPage, '/api/v1/settings/organization/branding', 'PUT', { primaryColor: '#135724' })).status).toBe(403);
    expect((await sessionRequest(invitedPage, `/api/organizations/${identity.organization}/members`)).status).toBe(403);
    expect((await sessionRequest(invitedPage, '/api/organizations/e2e-org-b')).status).toBe(403);

    // Keep the same signed user token across DB role changes. Tenant grants must
    // come from current membership rather than stale realm role claims.
    expect((await sessionRequest(page, `/api/organizations/${identity.organization}/members/${invitee.userId}`, 'PATCH', { role: 'admin' })).status).toBe(200);
    expect((await sessionRequest(invitedPage, `/api/organizations/${identity.organization}/members`)).status).toBe(200);
    expect((await sessionRequest(invitedPage, `/api/organizations/${identity.organization}/members/${identity.userId}`, 'PATCH', { role: 'viewer' })).status).toBe(403);
    const adminEmail = `admin-grant-${randomUUID()}@${identity.registration.emailDomain}`;
    expect((await sessionRequest(invitedPage, `/api/organizations/${identity.organization}/invitations`, 'POST', { email: adminEmail, role: 'admin' })).status).toBe(403);
    const allowedInvite = await sessionRequest<InvitationResponse>(invitedPage, `/api/organizations/${identity.organization}/invitations`, 'POST', { email: adminEmail, role: 'viewer' });
    expect(allowedInvite.status).toBe(201);
    expect(allowedInvite.body.deliveryStatus).toBe('unsent');
    expect((await sessionRequest(invitedPage, `/api/organizations/${identity.organization}/invitations/${allowedInvite.body.id}`, 'DELETE')).status).toBe(204);

    expect((await sessionRequest(page, `/api/organizations/${identity.organization}/members/${invitee.userId}`, 'PATCH', { role: 'viewer' })).status).toBe(200);
    expect((await sessionRequest(invitedPage, `/api/organizations/${identity.organization}/members`)).status).toBe(403);
    expect(await invitedPage.evaluate(() => (window as unknown as { keycloak: { tokenParsed: { jti: string } } }).keycloak.tokenParsed.jti)).toBe(refreshed.tokenId);
    expect((await sessionRequest(page, `/api/organizations/${identity.organization}/members/${invitee.userId}`, 'DELETE')).status).toBe(204);
    expect((await sessionRequest(invitedPage, `/api/organizations/${identity.organization}`)).status).toBe(403);
    expect((await sessionRequest(invitedPage, '/api/v1/settings/organization')).status).toBe(403);
    const inactive = await database.query('SELECT role,is_active FROM accounting.user_profiles WHERE id=$1', [invitee.userId]);
    expect(inactive.rows).toEqual([{ role: 'viewer', is_active: false }]);
  } finally {
    await invitedContext.close();
    await database.end();
  }
});

test.describe('disposable public registration', () => {
  // These five registration requests create persistent test identities. Report
  // failures directly instead of retrying writes within the rate-limit window.
  test.describe.configure({ retries: 0 });

  test('creates owner and invited accounts transactionally while email remains unverified and unsent', async ({ page, request, baseURL }) => {
    test.setTimeout(90_000);
    const database = await openIsolatedDatabase(baseURL);
    try {
      const adminToken = await keycloakAdminToken(request, baseURL);
      const adminHeaders = { Authorization: `Bearer ${adminToken}` };
      // Resolve the built-in client through a user mapping: listing clients would
      // require broader machine permissions than application registration needs.
      const importedRoles = await request.get(`http://localhost:8080/admin/realms/plainledger/users/${identity.userId}/role-mappings`, { headers: adminHeaders });
      expect(importedRoles.status()).toBe(200);
      const accountMapping = (await importedRoles.json() as { clientMappings?: Record<string, { id: string; client: string }> }).clientMappings?.account;
      expect(accountMapping?.client).toBe('account');
      expect(accountMapping?.id).toBeTruthy();
      const accountClientId = accountMapping!.id;
      const expectOwnAccountRoles = async (userId: string) => {
        const effectiveRoles = await request.get(`http://localhost:8080/admin/realms/plainledger/users/${encodeURIComponent(userId)}/role-mappings/clients/${encodeURIComponent(accountClientId)}/composite`, { headers: adminHeaders });
        expect(effectiveRoles.status()).toBe(200);
        expect(await effectiveRoles.json()).toEqual(expect.arrayContaining([
          expect.objectContaining({ name: 'manage-account', clientRole: true, containerId: accountClientId }),
          expect.objectContaining({ name: 'view-profile', clientRole: true, containerId: accountClientId }),
        ]));
      };
      const { emailDomain, ...registration } = identity.registration;
      const email = `signup-owner-${randomUUID()}@${emailDomain}`;
      const payload = { ...registration, email, password: identity.password };
      const created = await request.post('/api/auth/register', { data: payload });
      expect(created.status()).toBe(201);
      const owner = await created.json() as { userId: string; organizationId: string };
      expect(owner).toMatchObject({ success: true, email, requiresEmailVerification: true, verificationEmailSent: false });
      expect(owner.userId).toMatch(/^[a-f0-9-]{36}$/);
      expect(owner.organizationId).toMatch(/^[a-f0-9-]{36}$/);
      const keycloakOwner = await request.get(`http://localhost:8080/admin/realms/plainledger/users/${owner.userId}`, { headers: adminHeaders });
      expect(keycloakOwner.status()).toBe(200);
      expect(await keycloakOwner.json()).toMatchObject({ id: owner.userId, email, enabled: true, emailVerified: false, requiredActions: expect.arrayContaining(['VERIFY_EMAIL']), attributes: { organization: [owner.userId] } });
      await expectOwnAccountRoles(owner.userId);
      const ownerState = await database.query(`SELECT o.id,o.tenant_id,o.name,o.subscription_plan_id,p.id AS user_id,p.role,p.email_verified,p.is_active,f.updated_by
        FROM accounting.organizations o JOIN accounting.user_profiles p ON p.organization_id=o.id
        JOIN accounting.organization_features f ON f.organization_id=o.id WHERE o.id=$1 AND p.id=$2`, [owner.organizationId, owner.userId]);
      expect(ownerState.rows).toEqual([{ id: owner.organizationId, tenant_id: owner.userId, name: registration.organizationName, subscription_plan_id: 'free', user_id: owner.userId, role: 'owner', email_verified: false, is_active: true, updated_by: owner.userId }]);
      const duplicate = await request.post('/api/auth/register', { data: { ...payload, email: email.toUpperCase() } });
      expect(duplicate.status()).toBe(409);
      expect((await database.query('SELECT id FROM accounting.user_profiles WHERE email=$1', [email])).rowCount).toBe(1);

      await signIn(page);
      const invitedEmail = `signup-invited-${randomUUID()}@${emailDomain}`;
      const invited = await sessionRequest<InvitationResponse>(page, `/api/organizations/${identity.organization}/invitations`, 'POST', { email: invitedEmail, role: 'viewer' });
      expect(invited.status).toBe(201);
      expect(invited.body.deliveryStatus).toBe('unsent');
      const token = new URLSearchParams(new URL(invited.body.inviteUrl).hash.slice(1)).get('token');
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      const mismatchEmail = `signup-mismatch-${randomUUID()}@${emailDomain}`;
      const mismatch = await request.post('/api/auth/register', { data: { ...payload, email: mismatchEmail, invitationToken: token } });
      expect(mismatch.status()).toBe(403);
      expect((await database.query('SELECT id FROM accounting.user_profiles WHERE email=$1', [mismatchEmail])).rowCount).toBe(0);
      const missingIdentity = await request.get('http://localhost:8080/admin/realms/plainledger/users', { headers: adminHeaders, params: { email: mismatchEmail, exact: true } });
      expect(missingIdentity.status()).toBe(200);
      expect(await missingIdentity.json()).toEqual([]);
      expect((await database.query('SELECT status FROM accounting.organization_invitations WHERE id=$1', [invited.body.id])).rows).toEqual([{ status: 'pending' }]);

      const joined = await request.post('/api/auth/register', { data: { ...payload, email: invitedEmail, invitationToken: token } });
      expect(joined.status()).toBe(201);
      const member = await joined.json() as { userId: string; organizationId: string };
      expect(member).toMatchObject({ success: true, email: invitedEmail, organizationId: identity.organizationId, requiresEmailVerification: true, verificationEmailSent: false });
      const keycloakMember = await request.get(`http://localhost:8080/admin/realms/plainledger/users/${member.userId}`, { headers: adminHeaders });
      expect(keycloakMember.status()).toBe(200);
      expect(await keycloakMember.json()).toMatchObject({ emailVerified: false, requiredActions: expect.arrayContaining(['VERIFY_EMAIL']), attributes: { organization: [identity.organization] } });
      await expectOwnAccountRoles(member.userId);
      const joinedProfile = await database.query('SELECT organization_id,role,email_verified,registration_source FROM accounting.user_profiles WHERE id=$1', [member.userId]);
      expect(joinedProfile.rows).toEqual([{ organization_id: identity.organizationId, role: 'viewer', email_verified: false, registration_source: 'invite' }]);
      expect((await database.query('SELECT id FROM accounting.organizations WHERE tenant_id=$1', [member.userId])).rowCount).toBe(0);
      expect((await database.query('SELECT status,accepted_by FROM accounting.organization_invitations WHERE id=$1', [invited.body.id])).rows).toEqual([{ status: 'accepted', accepted_by: member.userId }]);
      expect((await sessionRequest(page, '/api/organizations/invitations/preview', 'POST', { token })).status).toBe(410);

      const invalidEmail = `signup-invalid-${randomUUID()}@${emailDomain}`;
      const invalid = await request.post('/api/auth/register', { data: { ...payload, email: invalidEmail, password: 'weak' } });
      expect(invalid.status()).toBe(400);
      expect((await database.query('SELECT id FROM accounting.user_profiles WHERE email=$1', [invalidEmail])).rowCount).toBe(0);
    } finally {
      await database.end();
    }
  });
});

for (const security of securityPages) {
  test(`${security.language} security settings open the signed-in Keycloak account`, async ({ page }) => {
    await page.addInitScript(language => {
      if (window.top === window && /^https?:$/.test(window.location.protocol)) {
        localStorage.setItem('plainledger-language', language);
      }
    }, security.language);
    await signIn(page);
    await page.goto(security.settingsPath);
    await expect(page.getByRole('heading', { name: security.heading, exact: true })).toBeVisible();
    for (const status of security.unavailableStatuses) {
      await expect(page.getByText(status, { exact: true })).toBeVisible();
    }
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
    const openAccount = page.getByRole('button', { name: security.openButton, exact: true });
    await expect(openAccount).toBeEnabled();

    const identityOrigin = new URL(process.env.KEYCLOAK_URL || 'http://localhost:8080').origin;
    const accountPath = `/realms/${process.env.KEYCLOAK_REALM || 'plainledger'}/account/`;
    const profile = page.waitForResponse(response => {
      const url = new URL(response.url());
      return url.origin === identityOrigin && url.pathname === accountPath &&
        response.request().method() === 'GET' &&
        (response.headers()['content-type'] || '').includes('application/json');
    });
    await openAccount.click();
    await page.waitForURL(url => url.origin === identityOrigin && (
      url.pathname === accountPath.slice(0, -1) || url.pathname.startsWith(accountPath)
    ));
    const account = await profile;
    expect(account.status()).toBe(200);
    expect(await account.json()).toMatchObject({ id: identity.userId, email: identity.username });
    // This is the real identity-provider UI and its authenticated profile response.
    // No password, MFA, session, account-profile or email mutation is performed.
    await expect(page.getByTestId('page-heading')).toContainText(/Personal info|Informations personnelles/i);
  });
}
