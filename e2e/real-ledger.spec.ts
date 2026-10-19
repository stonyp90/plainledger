import { test, expect, type Page } from '@playwright/test';
import { signIn } from './helpers/real-auth';
import identity from '../fixtures/auth/isolated-e2e.json';

const organizationA = identity.organizationId;
const organizationB = '00000000-0000-4000-8000-000000000200';

/** Every request uses the access token issued by the real PKCE browser login. */
async function authenticatedRequest(page: Page, path: string, method = 'GET', body?: unknown, organization = identity.organization) {
  return page.evaluate(async ({ path, method, body, organization }) => {
    const keycloak = (window as unknown as { keycloak: { token?: string; updateToken: (minimum: number) => Promise<boolean> } }).keycloak;
    await keycloak.updateToken(30);
    const response = await fetch(path, {
      method,
      headers: { Authorization: `Bearer ${keycloak.token}`, 'Content-Type': 'application/json', 'x-organization-id': organization },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  }, { path, method, body, organization });
}

const reportQuery = `query DatedReports($range: DateRangeInput!, $date: DateTime) {
  incomeStatement(dateRange: $range) {
    organizationName currency grossRevenue totalExpenses netIncome
    revenue { accountCode accountName amount }
    expenses { accountCode accountName amount }
  }
  balanceSheet(asOfDate: $date) {
    organizationName currency totalAssets totalLiabilities totalEquity
    assets { accountCode balance }
    equity { accountCode balance }
  }
}`;
const range = (start: string, end: string) => ({ startDate: `${start}T00:00:00.000Z`, endDate: `${end}T23:59:59.999Z` });

test('GraphQL reports reconcile to dated posted entries and reject invalid or foreign requests', async ({ page, request }) => {
  await signIn(page);
  const january = await authenticatedRequest(page, '/graphql', 'POST', {
    query: reportQuery, variables: { range: range('2026-01-01', '2026-01-31'), date: '2026-01-31T23:59:59.999Z' },
  });
  expect(january.status).toBe(200);
  expect(january.body.errors).toBeUndefined();
  expect(january.body.data.incomeStatement).toMatchObject({ organizationName: 'Isolated Ledger A', currency: 'CAD', grossRevenue: 2500, totalExpenses: 1000, netIncome: 1500 });
  expect(january.body.data.balanceSheet).toMatchObject({ totalAssets: 11500, totalLiabilities: 0, totalEquity: 11500 });
  expect(january.body.data.balanceSheet.assets).toContainEqual({ accountCode: '1000', balance: 11500 });
  expect(january.body.data.balanceSheet.equity).toContainEqual({ accountCode: 'EARNINGS', balance: 1500 });
  expect(JSON.stringify(january.body)).not.toMatch(/999999|777777|Other tenant/);

  const february = await authenticatedRequest(page, '/graphql', 'POST', {
    query: reportQuery, variables: { range: range('2026-02-01', '2026-02-28'), date: '2026-02-28T23:59:59.999Z' },
  });
  expect(february.body.errors).toBeUndefined();
  expect(february.body.data.incomeStatement).toMatchObject({ grossRevenue: 9000, totalExpenses: 0, netIncome: 9000 });
  expect(february.body.data.balanceSheet).toMatchObject({ totalAssets: 20500, totalLiabilities: 0, totalEquity: 20500 });

  const emptyPeriod = await authenticatedRequest(page, '/graphql', 'POST', {
    query: reportQuery, variables: { range: range('2025-01-01', '2025-01-31'), date: '2025-01-31T23:59:59.999Z' },
  });
  expect(emptyPeriod.body.errors).toBeUndefined();
  expect(emptyPeriod.body.data.incomeStatement).toMatchObject({ grossRevenue: 0, totalExpenses: 0, netIncome: 0 });
  expect(emptyPeriod.body.data.balanceSheet).toMatchObject({ totalAssets: 0, totalLiabilities: 0, totalEquity: 0 });

  const reversed = await authenticatedRequest(page, '/graphql', 'POST', {
    query: 'query($range: DateRangeInput!) { incomeStatement(dateRange:$range) { grossRevenue } }',
    variables: { range: range('2026-02-01', '2026-01-01') },
  });
  expect(reversed.body.errors).toHaveLength(1);
  expect(reversed.body.errors[0].extensions.code).toBe('BAD_REQUEST');

  const oversized = await authenticatedRequest(page, '/graphql', 'POST', {
    query: '{ accounts(pagination:{page:1,pageSize:100000}) { nodes { id } } }',
  });
  expect(oversized.body.errors).toHaveLength(1);
  expect(oversized.body.errors[0].extensions.code).toBe('BAD_REQUEST');

  const foreign = await authenticatedRequest(page, '/graphql', 'POST', { query: '{ organization { id name } }' }, 'e2e-org-b');
  expect(foreign.body.errors).toHaveLength(1);
  expect(foreign.body.errors[0].extensions.code).toBe('FORBIDDEN');
  expect(foreign.body.data).toBeNull();

  const anonymous = await request.post('/graphql', { data: { query: '{ organization { id } }' } });
  const anonymousBody = await anonymous.json();
  expect(anonymousBody.errors[0].extensions.code).toBe('UNAUTHENTICATED');
  expect(anonymousBody.data).toBeNull();
});

test('organization settings and invitation lifecycle persist with tenant and last-owner protection', async ({ page }) => {
  await signIn(page);
  const foreignIdentity = await authenticatedRequest(page, '/api/v1/settings/organization', 'PUT', {
    organizationId: organizationB, generalSettings: { province: 'BC' },
  });
  expect([400, 403]).toContain(foreignIdentity.status);
  const invalidThreshold = await authenticatedRequest(page, '/api/v1/settings/organization/thresholds', 'PUT', { varianceWarning: -5 });
  expect(invalidThreshold.status).toBe(400);
  const settings = await authenticatedRequest(page, '/api/v1/settings/organization', 'PUT', {
    generalSettings: { province: 'QC', currency: 'CAD', timezone: 'America/Toronto' },
    thresholdSettings: { varianceWarning: 17, varianceCritical: 35 },
  });
  expect(settings.status).toBe(200);
  expect(settings.body.organizationId).toBe(organizationA);
  const readBack = await authenticatedRequest(page, '/api/v1/settings/organization');
  expect(readBack.status).toBe(200);
  expect(readBack.body).toMatchObject({ organizationId: organizationA, generalSettings: { province: 'QC', currency: 'CAD', timezone: 'America/Toronto' }, thresholdSettings: { varianceWarning: 17, varianceCritical: 35 } });

  const features = await authenticatedRequest(page, `/api/analytics/org-features?organizationId=${organizationA}`);
  expect(features.status).toBe(200);
  expect(features.body).toMatchObject({ organizationId: organizationA, analytics: { plainledger: { enabled: true }, powerbi: { enabled: false } } });
  const foreignFeatures = await authenticatedRequest(page, `/api/analytics/org-features?organizationId=${organizationB}`);
  expect(foreignFeatures.status).toBe(403);

  const members = await authenticatedRequest(page, '/api/organizations/e2e-org-a/members');
  expect(members.status).toBe(200);
  expect(members.body).toEqual(expect.arrayContaining([expect.objectContaining({ id: identity.userId, role: 'owner' })]));
  const lastOwnerDemotion = await authenticatedRequest(page, `/api/organizations/e2e-org-a/members/${identity.userId}`, 'PATCH', { role: 'viewer' });
  expect(lastOwnerDemotion.status).toBe(409);
  const lastOwnerRemoval = await authenticatedRequest(page, `/api/organizations/e2e-org-a/members/${identity.userId}`, 'DELETE');
  expect(lastOwnerRemoval.status).toBe(409);
  const foreignMembers = await authenticatedRequest(page, '/api/organizations/e2e-org-b/members');
  expect(foreignMembers.status).toBe(403);

  const email = `invited-${Date.now()}@plainledger.test`;
  const invited = await authenticatedRequest(page, '/api/organizations/e2e-org-a/invitations', 'POST', { email, role: 'viewer' });
  expect(invited.status).toBe(201);
  expect(invited.body).toMatchObject({ email, role: 'viewer', status: 'pending', deliveryStatus: 'unsent' });
  const originalToken = new URLSearchParams(new URL(invited.body.inviteUrl).hash.slice(1)).get('token');
  expect(originalToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
  const preview = await authenticatedRequest(page, '/api/organizations/invitations/preview', 'POST', { token: originalToken });
  expect(preview.status).toBe(200);
  expect(preview.body).toMatchObject({ tenantId: 'e2e-org-a', email, role: 'viewer' });
  const wrongAccount = await authenticatedRequest(page, '/api/organizations/invitations/accept', 'POST', { token: originalToken });
  expect(wrongAccount.status).toBe(403);

  const rotated = await authenticatedRequest(page, `/api/organizations/e2e-org-a/invitations/${invited.body.id}/resend`, 'POST');
  expect(rotated.status).toBe(200);
  expect(rotated.body.deliveryStatus).toBe('unsent');
  const newToken = new URLSearchParams(new URL(rotated.body.inviteUrl).hash.slice(1)).get('token');
  expect(newToken).not.toBe(originalToken);
  const replaced = await authenticatedRequest(page, '/api/organizations/invitations/preview', 'POST', { token: originalToken });
  expect(replaced.status).toBe(404);
  const revoked = await authenticatedRequest(page, `/api/organizations/e2e-org-a/invitations/${invited.body.id}`, 'DELETE');
  expect(revoked.status).toBe(204);
  const revokedPreview = await authenticatedRequest(page, '/api/organizations/invitations/preview', 'POST', { token: newToken });
  expect(revokedPreview.status).toBe(410);
  const listed = await authenticatedRequest(page, '/api/organizations/e2e-org-a/invitations');
  expect(listed.body).toEqual(expect.arrayContaining([expect.objectContaining({ id: invited.body.id, status: 'revoked' })]));

  const providers = await authenticatedRequest(page, '/api/datasources/providers/available');
  expect(providers.status).toBe(200);
  expect(providers.body.every((provider: { supported: boolean }) => provider.supported === false)).toBe(true);
  const unavailableProvider = await authenticatedRequest(page, '/api/datasources/quickbooks/oauth/url', 'POST');
  expect([501, 503]).toContain(unavailableProvider.status);
  const dataSources = await authenticatedRequest(page, '/api/datasources');
  expect(dataSources.status).toBe(200);
  expect(dataSources.body).toEqual([]);
});
